import cytoscape from "cytoscape";
import { useEffect, useRef } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import coseBilkent from "cytoscape-cose-bilkent";

cytoscape.use(coseBilkent);

export function Cytoscape({ elements, style, layout, class: className }) {
  const ref = useRef();
  useEffect(() => {
    if (!ref.current) {
      return;
    }
    window.c = cytoscape;
    const cy = cytoscape({
      container: ref.current,
      elements: elements,
      style: style,
      layout: layout,
    });
    return () => {
      cy.destroy();
    };
  }, [elements, style, layout]);
  className = twMerge("w-full h-full", className);
  return (
    <div class="w-screen h-screen">
      <div class={className} ref={ref} />
    </div>
  );
}
