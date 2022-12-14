/* eslint no-unused-vars: "off" */
import { signal } from "@preact/signals";
import { holder } from "../key-management/key";
import {
  P,
  A,
  Card2,
  Code,
  Field,
  TextInput,
  Form,
  Alert,
  PageContainer,
  Button,
} from "../components/common";
import { Header } from "../components/header";

window.holder = holder;
export const hasKeySignal = signal(holder.hasKey());
holder.addOnUpdate(() => {
  hasKeySignal.value = holder.hasKey();
});
const keyError = signal("");

export const RequestKeyPage = () => {
  return (
    <PageContainer>
      <Header title="Set key" />
      <RequestKey />
    </PageContainer>
  );
};

export const RequestKey = () => {
  function onSubmit(textInput) {
    const setKey = holder.setKeyFromText(textInput);
    if (setKey) {
      keyError.value = "";
    } else {
      keyError.value = "Invalid key";
    }
  }
  return (
    <div class="flex items-center justify-center">
      <Card2 class="w-3/4" title="GPT-3 API key required">
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
          {hasKeySignal.value ? <ExistingKey gptKey={holder.getKey()} /> : null}
          {keyError.value ? <Alert>{keyError.value}</Alert> : null}
          <P>
            <Form onSubmit={onSubmit}>
              <Field>
                GPT key:
                <TextInput errored={!!keyError.value} />
              </Field>
            </Form>
          </P>
        </div>
      </Card2>
    </div>
  );
};

const ExistingKey = ({ gptKey }) => {
  function onRemove() {
    holder.removeKey();
  }
  return (
    <div>
      <P>You have a key already configured:</P>
      <P class="pl-5">
        <Code>
          {gptKey.slice(0, 3)}...
          {gptKey.slice(gptKey.length - 4, gptKey.length)}
        </Code>
      </P>
      <P>
        <Button onClick={onRemove}>Remove existing key</Button>
      </P>
    </div>
  );
};
