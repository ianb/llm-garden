/* eslint no-unused-vars: "off" */
import { signal } from "@preact/signals";
import { holder } from "../key-management/key";
import * as replicateKey from "../imageapi/replicatekey";
import {
  P,
  A,
  Card,
  Code,
  Field,
  TextInput,
  Form,
  Alert,
  PageContainer,
  Button,
} from "../components/common";
import { Header } from "../components/header";

const replicateHolder = replicateKey.holder;

window.holder = holder;
export const hasGptKeySignal = signal(holder.hasKey());
holder.addOnUpdate(() => {
  hasGptKeySignal.value = holder.hasKey();
});
const gptKeyError = signal("");

export const hasReplicateKeySignal = signal(replicateHolder.hasKey());
replicateHolder.addOnUpdate(() => {
  hasReplicateKeySignal.value = replicateHolder.hasKey();
});
const replicateKeyError = signal("");

export const RequestKeyPage = () => {
  return (
    <PageContainer>
      <Header title="Set key" />
      <RequestKey />
    </PageContainer>
  );
};

export const RequestKey = () => {
  function onSubmitGpt(textInput) {
    const setKey = holder.setKeyFromText(textInput);
    if (setKey) {
      gptKeyError.value = "";
    } else {
      gptKeyError.value = "Invalid key";
    }
    textInput.value = "";
  }
  function onSubmitReplicate(textInput) {
    const setKey = replicateHolder.setKeyFromText(textInput.value);
    if (setKey) {
      replicateKeyError.value = "";
    } else {
      replicateKeyError.value = "Invalid key";
    }
    textInput.value = "";
  }

  console.log(
    "has key",
    hasGptKeySignal.value,
    holder.hasKey(),
    holder.hasKey() && holder.getKey()
  );

  return (
    <div class="flex items-center justify-center">
      <Card class="w-3/4" title="GPT-3 API key required">
        <div class="p-5">
          <P>
            This application requires a GPT-3 key. To use it you must enter one
            here; it will be stored locally in this browser and be used only to
            make requests from this browser to GPT-3 directly. If you just want
            to test this you can create a key and then delete it.
          </P>
          <P>
            If you do not have a key you can sign up at{" "}
            <A href="https://openai.com/api/">openai.com/api</A> and then create
            a key at{" "}
            <A href="https://beta.openai.com/account/api-keys">
              beta.openai.com/account/api-keys
            </A>
          </P>
          <P>
            For image generation you can use{" "}
            <a href="https://replicate.com/">Replicate</a> and generate a key in
            your <a href="https://replicate.com/account">Account Settings</a>
          </P>
          {hasGptKeySignal.value ? (
            <ExistingKey name="OpenAI GPT key" holder={holder} />
          ) : null}
          {gptKeyError.value ? <Alert>{gptKeyError.value}</Alert> : null}
          {hasReplicateKeySignal.value ? (
            <ExistingKey name="Replicate.com key" holder={replicateHolder} />
          ) : null}
          {replicateKeyError.value ? (
            <Alert>{replicateKeyError.value}</Alert>
          ) : null}
          <P>
            <Field>
              GPT key:
              <TextInput onSubmit={onSubmitGpt} errored={!!gptKeyError.value} />
            </Field>
            <Field>
              Replicate key (optional):
              <TextInput
                onSubmit={onSubmitReplicate}
                errored={!!replicateKeyError.value}
              />
            </Field>
          </P>
        </div>
      </Card>
    </div>
  );
};

const ExistingKey = ({ name, holder }) => {
  function onRemove() {
    holder.removeKey();
  }
  return (
    <div>
      <P>You have a {name} already configured:</P>
      <P class="pl-5">
        <Code>
          {holder.getKey().slice(0, 3)}...
          {holder.getKey().slice(-3)}
        </Code>
      </P>
      <P>
        <Button onClick={onRemove}>Remove existing key</Button>
      </P>
    </div>
  );
};
