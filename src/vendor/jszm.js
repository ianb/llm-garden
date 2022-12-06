/*
  JSZM - JavaScript implementation of Z-machine
  This program is in public domain.

  Documentation:

  The exported function called JSZM is the constructor, which takes a
  Uint8Array as input. You can also use JSZM.Version for the version
  number which is object with properties: major, minor, subminor,
  timestamp. Properties of JSZM instances are:

  .highlight(fixpitch) = A generator function you define, which will be
  called to update the highlighting mode, which is fixpitch (if the
  argument is true) or normal (if argument is false). (You don't have to
  set it if you aren't implementing variable pitch by default.)

  .isTandy = A boolean, normally false. Set it to true to tell the game
  that it is a Tandy computer; this affects some games.

  .print(text,scripting) = A generator function that you must define, and
  will be called to print text. You must implement wrapping and buffering
  and scripting yourself. The second argument is true if it should be
  copied to the transcript or false if it should not be.

  .read(maxlen) = A generator function which you must define yourself, and
  which should return a string containing the player's input. Called when
  a READ instruction is executed; the argument is the maximum number of
  characters that are allowed (if you return a longer string, it will be
  truncated).

  .restarted() = A generator function you can optionally define. When the
  game starts or if restarted (with the RESTART instruction), it will be
  called after memory is initialized but before executing any more.

  .restore() = A generator function you can define yourself, which is
  called when restoring a saved game. Return a Uint8Array with the same
  contents passed to save() if successful, or you can return false or null
  or undefined if it failed.

  .run() = A generator function. Call it to run the program from the
  beginning, and call the next() method of the returned object to begin
  and to continue. This generator may call your own generator functions
  which may yield; it doesn't otherwise yield by itself. You must set up
  the other methods before calling run so that it can properly set up the
  contents of the Z-machine mode byte. This generator only finishes when a
  QUIT instruction is executed.

  .save(buf) = A generator function you can define yourself, and is called
  when saving the game. The argument is a Uint8Array, and you should
  attempt to save its contents somewhere, and then return true if
  successful or false if it failed.

  .serial = The serial number of the story file, as six ASCII characters.

  .screen(window) = Normally null. You can set it to a generator function
  which will be called when the SCREEN opcode is executed if you want to
  implement split screen.

  .split(height) = Normally null. You can set it to a generator function
  which will be called when the SPLIT opcode is executed if you want to
  implement split screen.

  .statusType = False for score/moves and true for hours/minutes. Use this
  to determine the meaning of arguments to updateStatusLine.

  .updateStatusLine(text,v18,v17) = Normally null, but can be a generator
  function if you are implementing the status line. It is called when a
  READ or USL instruction is executed. See statusType for the meaning of
  v18 and v17. Return value is unused.

  .verify() = A normal function. Calling it will attempt to verify the
  story file, and returns true if successful or false on error. You can
  override it with your own verification function if you want to.

  .zorkid = The ZORKID of the story file. This is what is normally
  displayed as the release number.
*/

"use strict";

const JSZM_Version = {
  major: 2,
  minor: 0,
  subminor: 2,
  timestamp: 1480624305074,
};

function JSZM(arr) {
  var mem;
  mem = this.memInit = new Uint8Array(arr);
  if (mem[0] != 3) {
    console.log("Unsupported Z-code version: " + mem[0]);
  }
  this.byteSwapped = !!(mem[1] & 1);
  this.statusType = !!(mem[1] & 2);
  this.serial = String.fromCharCode(...mem.slice(18, 24));
  this.zorkid =
    (mem[2] << (this.byteSwapped ? 0 : 8)) |
    (mem[3] << (this.byteSwapped ? 8 : 0));
}

JSZM.prototype = {
  byteSwapped: false,
  constructor: JSZM,
  deserialize: function (ar) {
    var e, i, j, ds, cs, pc, vi, purbot;
    var g8, g16s, g16, g24, g32;
    g8 = () => ar[e++];
    g16s = () => ((e += 2), vi.getInt16(e - 2));
    g16 = () => ((e += 2), vi.getUint16(e - 2));
    g24 = () => ((e += 3), vi.getUint32(e - 4) & 0xffffff);
    g32 = () => ((e += 4), vi.getUint32(e - 4));
    try {
      e = purbot = this.getu(14);
      vi = new DataView(ar.buffer);
      if (ar[2] != this.mem[2] || ar[3] != this.mem[3]) return null; // ZORKID does not match
      pc = g32();
      cs = new Array(g16());
      ds = Array.from({ length: g16() }, g16s);
      for (i = 0; i < cs.length; i++) {
        cs[i] = {};
        cs[i].local = new Int16Array(g8());
        cs[i].pc = g24();
        cs[i].ds = Array.from({ length: g16() }, g16s);
        for (j = 0; j < cs[i].local.length; j++) cs[i].local[j] = g16s();
      }
      this.mem.set(new Uint8Array(ar.buffer, 0, purbot));
      return [ds, cs, pc];
    } catch (e) {
      return null;
    }
  },
  endText: 0,
  fwords: null,
  genPrint: function* (text) {
    var x = this.get(16);
    if (x != this.savedFlags) {
      this.savedFlags = x;
      yield* this.highlight(!!(x & 2));
    }
    yield* this.print(text, !!(x & 1));
  },
  get: function (x) {
    return this.view.getInt16(x, this.byteSwapped);
  },
  getText: function (addr) {
    var d; // function to parse each Z-character
    var o = ""; // output
    var ps = 0; // permanent shift
    var ts = 0; // temporary shift
    var w; // read each 16-bits data
    var y; // auxiliary data for parsing state
    d = (v) => {
      if (ts == 3) {
        y = v << 5;
        ts = 4;
      } else if (ts == 4) {
        y += v;
        if (y == 13) o += "\n";
        else if (y) o += String.fromCharCode(y);
        ts = ps;
      } else if (ts == 5) {
        o += this.getText(this.getu(this.fwords + (y + v) * 2) * 2);
        ts = ps;
      } else if (v == 0) {
        o += " ";
      } else if (v < 4) {
        ts = 5;
        y = (v - 1) * 32;
      } else if (v < 6) {
        if (!ts) ts = v - 3;
        else if (ts == v - 3) ps = ts;
        else ps = ts = 0;
      } else if (v == 6 && ts == 2) {
        ts = 3;
      } else {
        o +=
          "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ*\n0123456789.,!?_#'\"/\\-:()"[
            ts * 26 + v - 6
          ];
        ts = ps;
      }
    };
    for (;;) {
      w = this.getu(addr);
      addr += 2;
      d((w >> 10) & 31);
      d((w >> 5) & 31);
      d(w & 31);
      if (w & 32768) break;
    }
    this.endText = addr;
    return o;
  },
  getu: function (x) {
    return this.view.getUint16(x, this.byteSwapped);
  },
  handleInput: function (str, t1, t2) {
    var i, br, w;
    // Put text
    console.log("handleInput", str, t1, t2);
    str = str.toLowerCase().slice(0, this.mem[t1] - 1);
    for (i = 0; i < str.length; i++) this.mem[t1 + i + 1] = str.charCodeAt(i);
    this.mem[t1 + str.length + 1] = 0;
    // Lex text
    w = (x) => (
      (i = 0),
      x
        .split("")
        .filter(
          (y) =>
            (i += /[a-z]/.test(y)
              ? 1
              : /[0-9.,!?_#'"\/\\:\-()]/.test(y)
              ? 2
              : 4) < 7
        )
        .join("")
    );
    br = JSON.parse(
      "[" +
        str
          .replace(
            this.regBreak,
            (m, o) =>
              ",[" +
              m.length +
              "," +
              (this.vocabulary.get(w(m)) || 0) +
              "," +
              (o + 1) +
              "]"
          )
          .slice(1) +
        "]"
    );
    i = this.mem[t2 + 1] = br.length;
    while (i--) {
      this.putu(t2 + i * 4 + 2, br[i][1]);
      this.mem[t2 + i * 4 + 4] = br[i][0];
      this.mem[t2 + i * 4 + 5] = br[i][2];
    }
  },
  highlight: () => [],
  isTandy: false,
  mem: null,
  memInit: null,
  parseVocab: function (s) {
    this.vocabulary = new Map();

    if (s === 0) {
      // If the story file does not contain a dictionary..
      this.regBreak = new RegExp("[^ \\n\\t]+", "g"); //   use the default word separators
      return; //   and early exit.
    }

    var e;
    var n;
    n = this.mem[s++];
    e = this.selfInsertingBreaks = String.fromCharCode(
      ...this.mem.slice(s, s + n)
    );
    e =
      e
        .split("")
        .map((x) => (x.toUpperCase() == x.toLowerCase() ? "" : "\\") + x)
        .join("") + "]";
    this.regBreak = new RegExp("[" + e + "|[^ \\n\\t" + e + "+", "g");
    s += n;
    e = this.mem[s++];
    n = this.get(s);
    s += 2;
    while (n--) {
      this.vocabulary.set(this.getText(s), s);
      s += e;
    }
  },
  print: () => [],
  put: function (x, y) {
    return this.view.setInt16(x, y, this.byteSwapped);
  },
  putu: function (x, y) {
    return this.view.setUint16(x, y & 65535, this.byteSwapped);
  },
  read: () => [],
  regBreak: null,
  restarted: () => [],
  restore: () => [],
  run: function* () {
    var mem, pc, cs, ds, op0, op1, op2, op3, opc, inst, x, y, z;
    var globals, objects, fwords, defprop;
    var addr,
      fetch,
      flagset,
      init,
      move,
      opfetch,
      pcfetch,
      pcget,
      pcgetb,
      pcgetu,
      predicate,
      propfind,
      ret,
      store,
      xfetch,
      xstore;

    // Functions
    addr = (x) => (x & 65535) << 1;
    fetch = (x) => {
      if (x == 0) return ds.pop();
      if (x < 16) return cs[0].local[x - 1];
      return this.get(globals + 2 * x);
    };
    flagset = () => {
      op3 = 1 << (15 & ~op1);
      op2 = objects + op0 * 9 + (op1 & 16 ? 2 : 0);
      opc = this.get(op2);
    };
    const initRng = () => {
      this.seed = (Math.random() * 0xffffffff) >>> 0;
    };
    init = () => {
      mem = this.mem = new Uint8Array(this.memInit);
      this.view = new DataView(mem.buffer);
      mem[1] &= 3;
      if (this.isTandy) mem[1] |= 8;
      if (!this.updateStatusLine) mem[1] |= 16;
      if (this.screen && this.split) mem[1] |= 32;
      this.put(16, this.savedFlags);
      if (!this.vocabulary) this.parseVocab(this.getu(8));
      defprop = this.getu(10) - 2;
      globals = this.getu(12) - 32;
      this.fwords = fwords = this.getu(24);
      cs = [];
      ds = [];
      pc = this.getu(6);
      objects = defprop + 55;
      initRng();
    };
    move = (x, y) => {
      var w, z;
      // Remove from old FIRST-NEXT chain
      if ((z = mem[objects + x * 9 + 4])) {
        if (mem[objects + z * 9 + 6] == x) {
          // is x.loc.first=x?
          mem[objects + z * 9 + 6] = mem[objects + x * 9 + 5]; // x.loc.first=x.next
        } else {
          z = mem[objects + z * 9 + 6]; // z=x.loc.first
          while (z != x) {
            w = z;
            z = mem[objects + z * 9 + 5]; // z=z.next
          }
          mem[objects + w * 9 + 5] = mem[objects + x * 9 + 5]; // w.next=x.next
        }
      }
      // Insert at beginning of new FIRST-NEXT chain
      if ((mem[objects + x * 9 + 4] = y)) {
        // x.loc=y
        mem[objects + x * 9 + 5] = mem[objects + y * 9 + 6]; // x.next=y.first
        mem[objects + y * 9 + 6] = x; // y.first=x
      } else {
        mem[objects + x * 9 + 5] = 0; // x.next=0
      }
    };
    opfetch = (x, y) => {
      if ((x &= 3) == 3) return;
      opc = y;
      return [pcget, pcgetb, pcfetch][x]();
    };
    pcfetch = (x) => fetch(mem[pc++]);
    pcget = () => {
      pc += 2;
      return this.get(pc - 2);
    };
    pcgetb = () => mem[pc++];
    pcgetu = () => {
      pc += 2;
      return this.getu(pc - 2);
    };
    predicate = (p) => {
      var x = pcgetb();
      if (x & 128) p = !p;
      if (x & 64) x &= 63;
      else x = ((x & 63) << 8) | pcgetb();
      if (p) return;
      if (x == 0 || x == 1) return ret(x);
      if (x & 0x2000) x -= 0x4000;
      pc += x - 2;
    };
    propfind = () => {
      var z = this.getu(objects + op0 * 9 + 7);
      z += mem[z] * 2 + 1;
      while (mem[z]) {
        if ((mem[z] & 31) == op1) {
          op3 = z + 1;
          return true;
        } else {
          z += (mem[z] >> 5) + 2;
        }
      }
      op3 = 0;
      return false;
    };
    ret = (x) => {
      ds = cs[0].ds;
      pc = cs[0].pc;
      cs.shift();
      store(x);
    };
    store = (y) => {
      var x = pcgetb();
      if (x == 0) ds.push(y);
      else if (x < 16) cs[0].local[x - 1] = y;
      else this.put(globals + 2 * x, y);
    };
    xfetch = (x) => {
      if (x == 0) return ds[ds.length - 1];
      if (x < 16) return cs[0].local[x - 1];
      return this.get(globals + 2 * x);
    };
    xstore = (x, y) => {
      if (x == 0) ds[ds.length - 1] = y;
      else if (x < 16) cs[0].local[x - 1] = y;
      else this.put(globals + 2 * x, y);
    };

    // Initializations
    init();
    yield* this.restarted();
    yield* this.highlight(!!(this.savedFlags & 2));

    // Main loop
    main: for (;;) {
      inst = pcgetb();
      if (inst < 128) {
        // 2OP
        if (inst & 64) op0 = pcfetch();
        else op0 = pcgetb();
        if (inst & 32) op1 = pcfetch();
        else op1 = pcgetb();
        inst &= 31;
        opc = 2;
      } else if (inst < 176) {
        // 1OP
        x = (inst >> 4) & 3;
        inst &= 143;
        if (x == 0) op0 = pcget();
        else if (x == 1) op0 = pcgetb();
        else if (x == 2) op0 = pcfetch();
      } else if (inst >= 192) {
        // EXT
        x = pcgetb();
        op0 = opfetch(x >> 6, 1);
        op1 = opfetch(x >> 4, 2);
        op2 = opfetch(x >> 2, 3);
        op3 = opfetch(x >> 0, 4);
        if (inst < 224) inst &= 31;
      }
      switch (inst) {
        case 1: // EQUAL?
          predicate(
            op0 == op1 || (opc > 2 && op0 == op2) || (opc == 4 && op0 == op3)
          );
          break;
        case 2: // LESS?
          predicate(op0 < op1);
          break;
        case 3: // GRTR?
          predicate(op0 > op1);
          break;
        case 4: // DLESS?
          xstore(op0, (x = xfetch(op0) - 1));
          predicate(x < op1);
          break;
        case 5: // IGRTR?
          xstore(op0, (x = xfetch(op0) + 1));
          predicate(x > op1);
          break;
        case 6: // IN?
          predicate(mem[objects + op0 * 9 + 4] == op1);
          break;
        case 7: // BTST
          predicate((op0 & op1) == op1);
          break;
        case 8: // BOR
          store(op0 | op1);
          break;
        case 9: // BAND
          store(op0 & op1);
          break;
        case 10: // FSET?
          flagset();
          predicate(opc & op3);
          break;
        case 11: // FSET
          flagset();
          this.put(op2, opc | op3);
          break;
        case 12: // FCLEAR
          flagset();
          this.put(op2, opc & ~op3);
          break;
        case 13: // SET
          xstore(op0, op1);
          break;
        case 14: // MOVE
          move(op0, op1);
          break;
        case 15: // GET
          store(this.get((op0 + op1 * 2) & 65535));
          break;
        case 16: // GETB
          store(mem[(op0 + op1) & 65535]);
          break;
        case 17: // GETP
          if (propfind()) store(mem[op3 - 1] & 32 ? this.get(op3) : mem[op3]);
          else store(this.get(defprop + 2 * op1));
          break;
        case 18: // GETPT
          propfind();
          store(op3);
          break;
        case 19: // NEXTP
          if (op1) {
            // Return next property
            propfind();
            store(mem[op3 + (mem[op3 - 1] >> 5) + 1] & 31);
          } else {
            // Return first property
            x = this.getu(objects + op0 * 9 + 7);
            store(mem[x + mem[x] * 2 + 1] & 31);
          }
          break;
        case 20: // ADD
          store(op0 + op1);
          break;
        case 21: // SUB
          store(op0 - op1);
          break;
        case 22: // MUL
          store(Math.imul(op0, op1));
          break;
        case 23: // DIV
          store(Math.trunc(op0 / op1));
          break;
        case 24: // MOD
          store(op0 % op1);
          break;
        case 128: // ZERO?
          predicate(!op0);
          break;
        case 129: // NEXT?
          store((x = mem[objects + op0 * 9 + 5]));
          predicate(x);
          break;
        case 130: // FIRST?
          store((x = mem[objects + op0 * 9 + 6]));
          predicate(x);
          break;
        case 131: // LOC
          store(mem[objects + op0 * 9 + 4]);
          break;
        case 132: // PTSIZE
          store((mem[(op0 - 1) & 65535] >> 5) + 1);
          break;
        case 133: // INC
          x = xfetch(op0);
          xstore(op0, x + 1);
          break;
        case 134: // DEC
          x = xfetch(op0);
          xstore(op0, x - 1);
          break;
        case 135: // PRINTB
          yield* this.genPrint(this.getText(op0 & 65535));
          break;
        case 137: // REMOVE
          move(op0, 0);
          break;
        case 138: // PRINTD
          yield* this.genPrint(
            this.getText(this.getu(objects + op0 * 9 + 7) + 1)
          );
          break;
        case 139: // RETURN
          ret(op0);
          break;
        case 140: // JUMP
          pc += op0 - 2;
          break;
        case 141: // PRINT
          yield* this.genPrint(this.getText(addr(op0)));
          break;
        case 142: // VALUE
          store(xfetch(op0));
          break;
        case 143: // BCOM
          store(~op0);
          break;
        case 176: // RTRUE
          ret(1);
          break;
        case 177: // RFALSE
          ret(0);
          break;
        case 178: // PRINTI
          yield* this.genPrint(this.getText(pc));
          pc = this.endText;
          break;
        case 179: // PRINTR
          yield* this.genPrint(this.getText(pc) + "\n");
          ret(1);
          break;
        case 180: // NOOP
          break;
        case 181: // SAVE
          this.savedFlags = this.get(16);
          predicate(yield* this.save(this.serialize(ds, cs, pc)));
          break;
        case 182: // RESTORE
          this.savedFlags = this.get(16);
          if ((z = yield* this.restore())) z = this.deserialize(z);
          this.put(16, this.savedFlags);
          if (z) (ds = z[0]), (cs = z[1]), (pc = z[2]);
          predicate(z);
          break;
        case 183: // RESTART
          init();
          yield* this.restarted();
          break;
        case 184: // RSTACK
          ret(ds[ds.length - 1]);
          break;
        case 185: // FSTACK
          ds.pop();
          break;
        case 186: // QUIT
          return;
        case 187: // CRLF
          yield* this.genPrint("\n");
          break;
        case 188: // USL
          if (this.updateStatusLine)
            yield* this.updateStatusLine(
              this.getText(this.getu(objects + xfetch(16) * 9 + 7) + 1),
              xfetch(18),
              xfetch(17)
            );
          break;
        case 189: // VERIFY
          predicate(this.verify());
          break;
        case 224: // CALL
          if (op0) {
            x = mem[(op0 = addr(op0))];
            cs.unshift({ ds: ds, pc: pc, local: new Int16Array(x) });
            ds = [];
            pc = op0 + 1;
            for (x = 0; x < mem[op0]; x++) cs[0].local[x] = pcget();
            if (opc > 1 && mem[op0] > 0) cs[0].local[0] = op1;
            if (opc > 2 && mem[op0] > 1) cs[0].local[1] = op2;
            if (opc > 3 && mem[op0] > 2) cs[0].local[2] = op3;
          } else {
            store(0);
          }
          break;
        case 225: // PUT
          this.put((op0 + op1 * 2) & 65535, op2);
          break;
        case 226: // PUTB
          mem[(op0 + op1) & 65535] = op2;
          break;
        case 227: // PUTP
          propfind();
          if (mem[op3 - 1] & 32) this.put(op3, op2);
          else mem[op3] = op2;
          break;
        case 228: // READ
          yield* this.genPrint("");
          if (this.updateStatusLine)
            yield* this.updateStatusLine(
              this.getText(this.getu(objects + xfetch(16) * 9 + 7) + 1),
              xfetch(18),
              xfetch(17)
            );
          console.log("read", mem[op0 & 65535]);
          let val = yield* this.read(mem[op0 & 65535]);
          console.log("value is", val);
          this.handleInput(val, op0 & 65535, op1 & 65535);
          break;
        case 229: // PRINTC
          yield* this.genPrint(
            op0 == 13 ? "\n" : op0 ? String.fromCharCode(op0) : ""
          );
          break;
        case 230: // PRINTN
          yield* this.genPrint(String(op0));
          break;
        case 231: // RANDOM
          if (op0 <= 0) {
            // If 'op0' is non-positive, reseed the PRNG.
            if (op0 === 0) {
              initRng(); // If 0, seed using Math.random().
            } else {
              this.seed = op0 >>> 0; // If negative, seed with the specified value.
            }
            store(0); // Reseeding always returns 0.
            break;
          }
          this.seed = (1664525 * this.seed + 1013904223) >>> 0; // Linear congruential generator
          store(Math.floor((this.seed / 0xffffffff) * op0) + 1); // Return integer in range [1..op0] (inclusive).
          break;
        case 232: // PUSH
          ds.push(op0);
          break;
        case 233: // POP
          xstore(op0, ds.pop());
          break;
        case 234: // SPLIT
          if (this.split) yield* this.split(op0);
          break;
        case 235: // SCREEN
          if (this.screen) yield* this.screen(op0);
          break;
        case 0: // ?
          console.warn("Got zero opcode (ignoring)");
          break;
        default:
          throw new Error(`JSZM: Invalid Z-machine opcode: ${inst}`);
      }
    }
  },
  save: () => [],
  savedFlags: 0,
  selfInsertingBreaks: null,
  serial: null,
  serialize: function (ds, cs, pc) {
    var i, j, e, ar, vi;
    e = this.getu(14); // PURBOT
    i =
      e +
      cs.reduce((p, c) => p + 2 * (c.ds.length + c.local.length) + 6, 0) +
      2 * ds.length +
      8;
    ar = new Uint8Array(i);
    ar.set(new Uint8Array(this.mem.buffer, 0, e));
    vi = new DataView(ar.buffer);
    vi.setUint32(e, pc);
    vi.setUint16(e + 4, cs.length);
    vi.setUint16(e + 6, ds.length);
    for (i = 0; i < ds.length; i++) vi.setInt16(e + i * 2 + 8, ds[i]);
    e += ds.length * 2 + 8;
    for (i = 0; i < cs.length; i++) {
      vi.setUint32(e, cs[i].pc);
      vi.setUint8(e, cs[i].local.length);
      vi.setUint16(e + 4, cs[i].ds.length);
      for (j = 0; j < cs[i].ds.length; j++)
        vi.setInt16(e + j * 2 + 6, cs[i].ds[j]);
      for (j = 0; j < cs[i].local.length; j++)
        vi.setInt16(e + cs[i].ds.length * 2 + j * 2 + 6, cs[i].local[j]);
      e += (cs[i].ds.length + cs[i].local.length) * 2 + 6;
    }
    return ar;
  },
  screen: null,
  split: null,
  statusType: null,
  updateStatusLine: null,
  verify: function () {
    var plenth = this.getu(26);
    var pchksm = this.getu(28);
    var i = 64;
    while (i < plenth * 2) pchksm = (pchksm - this.memInit[i++]) & 65535;
    return !pchksm;
  },
  view: null,
  vocabulary: null,
  zorkid: null,
};

JSZM.version = JSZM_Version;

export default JSZM;
