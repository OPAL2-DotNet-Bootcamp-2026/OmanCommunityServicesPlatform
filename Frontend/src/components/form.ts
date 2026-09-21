import { announceStatus, errorMessage, setAlert } from "../dom";
import { setButtonBusy } from "./motion";

export interface FormElements {
  form: HTMLFormElement;
  submit: HTMLButtonElement;
  status: HTMLElement;
}

interface FormOptions {
  loadingLabel: string;
  failureMessage: string;
  submit: () => Promise<void>;
  onError?: () => void;
}

type FormBinding = (elements: FormElements, options: FormOptions) => void;

/** Keeps one submission state per page, including when its form is rebound. */
export function createFormBinding(): FormBinding {
  let elements: FormElements;
  let options: FormOptions;
  let submitting = false;
  const setSubmitting = (busy: boolean): void => {
    submitting = busy;
    elements.form.setAttribute("aria-busy", String(busy));
    setButtonBusy(elements.submit, busy, options.loadingLabel);
  };
  const submit = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    if (submitting || !elements.form.reportValidity()) return;
    setAlert(elements.status, "");
    setSubmitting(true);
    try {
      await options.submit();
    } catch (error) {
      announceStatus(elements.status, errorMessage(error, options.failureMessage), "danger");
      options.onError?.();
      elements.status.focus();
    } finally {
      setSubmitting(false);
    }
  };
  return (currentElements, currentOptions) => {
    elements = currentElements;
    options = currentOptions;
    elements.form.addEventListener("submit", (event) => { void submit(event); });
  };
}
