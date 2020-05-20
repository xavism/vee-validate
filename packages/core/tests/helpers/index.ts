import { ComponentPublicInstance } from 'vue';
import { ValidationProvider, ValidationObserver } from '@vee-validate/core';
import { mount } from '@vue/test-utils';

export { mount };

export function mountWithHoc(component: Record<string, any>) {
  component.components = {
    ...(component.components || {}),
    ValidationProvider,
    ValidationObserver,
  };

  return mount(component);
}

const HTML_TAGS = ['INPUT', 'SELECT'];

export function setValue(node: ComponentPublicInstance | HTMLInputElement, value: any) {
  if (HTML_TAGS.includes((node as any).tagName)) {
    const input = node as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new window.Event('input'));
    input.dispatchEvent(new window.Event('change'));
    return;
  }

  (node as any).$emit('input', value);
}

export function dispatchEvent(node: ComponentPublicInstance | HTMLInputElement, eventName: string) {
  if (HTML_TAGS.includes((node as any).tagName)) {
    const input = node as HTMLInputElement;
    input.dispatchEvent(new window.Event(eventName));
    return;
  }

  (node as any).$emit(eventName);
}
