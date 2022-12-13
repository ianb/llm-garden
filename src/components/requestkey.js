/* eslint no-unused-vars: "off" */
import { signal } from "@preact/signals";
import { holder } from "../key-management/key";
import {
  P,
  Card,
  H1,
  Field,
  TextInput,
  Form,
  Alert,
  PageContainer,
} from "./common";
import { Header } from "./header";

export const hasKeySignal = signal(holder.hasKey());
const keyError = signal("");

export const RequestKeyPage = () => {
  <PageContainer>
    <Header title="Set key" />
    <RequestKey />
  </PageContainer>;
};

export const RequestKey = () => {
  function onSubmit(textInput) {
    const setKey = holder.setKeyFromText(textInput);
    if (setKey) {
      hasKeySignal.value = true;
      keyError.value = "";
    } else {
      keyError.value = "Invalid key";
    }
  }
  return (
    <Card>
      <H1>Required API key:</H1>
      <P>
        This application requires a GPT-3 key. To use it you must enter one
        here; it will be stored locally in this browser and be used only to make
        requests from this browser to GPT-3 directly.
      </P>
      {keyError.value ? <Alert>{keyError.value}</Alert> : null}
      <div>
        <Form onSubmit={onSubmit}>
          <Field>
            GPT key:
            <TextInput errored={!!keyError.value} />
          </Field>
        </Form>
      </div>
    </Card>
  );
};
