import flushPromises from 'flush-promises';
import { mountWithHoc } from './helpers';

const DEFAULT_REQUIRED_MESSAGE = (name: string) => `The ${name} field is required`;

test('renders the as prop', () => {
  const wrapper = mountWithHoc({
    template: `
      <div>
        <ValidationObserver as="form" />
      </div>
    `,
  });

  expect(wrapper.html()).toBe(`<form novalidate=""></form>`);
});

test('observes the current state of providers', async () => {
  const wrapper = mountWithHoc({
    template: `
      <ValidationObserver as="form" v-slot="{ meta }">
        <ValidationProvider name="field" rules="required" as="input" type="text" />

        <span id="state">{{ meta.valid }}</span>
      </ValidationObserver>
    `,
  });

  const stateSpan = wrapper.find('#state');
  const input = wrapper.find('input');
  input.setValue('');

  await flushPromises();
  // initially the field valid flag is false.
  expect(stateSpan.text()).toBe('false');

  input.setValue('value');
  await flushPromises();

  expect(stateSpan.text()).toBe('true');
});

test('submit handler only executes if observer is valid', async () => {
  let calls = 0;
  const wrapper = mountWithHoc({
    setup() {
      return {
        submit() {
          calls++;
        },
      };
    },
    template: `
      <ValidationObserver @submit="submit" as="form" v-slot="{ errors }">
        <ValidationProvider name="field" rules="required" as="input" />
        <span id="error">{{ errors.field }}</span>

        <button>Validate</button>
      </ValidationObserver>
    `,
  });

  const error = wrapper.find('#error');
  const input = wrapper.find('input');
  await flushPromises();
  expect(error.text()).toBe('');

  wrapper.find('button').trigger('click');
  await flushPromises();
  expect(calls).toBe(0);

  expect(error.text()).toBe(DEFAULT_REQUIRED_MESSAGE('field'));
  input.setValue('12');
  wrapper.find('button').trigger('click');
  await flushPromises();

  expect(error.text()).toBe('');
  expect(calls).toBe(1);
});

test('handles reset', async () => {
  let isReset = false;
  const wrapper = mountWithHoc({
    setup() {
      return {
        reset: () => {
          isReset = true;
        },
      };
    },
    template: `
      <ValidationObserver @reset="reset" as="form" v-slot="{ errors }">
        <ValidationProvider rules="required" name="field" as="input"/>
        <span id="error">{{ errors.field }}</span>

        <button id="submit">Validate</button>
        <button id="reset" type="reset">Reset</button>
      </ValidationObserver>
    `,
  });

  const error = wrapper.find('#error');
  expect(error.text()).toBe('');

  wrapper.find('#submit').trigger('click');
  await flushPromises();

  expect(error.text()).toBe(DEFAULT_REQUIRED_MESSAGE('field'));

  wrapper.find('#reset').trigger('click');
  await flushPromises();

  expect(error.text()).toBe('');
  expect(isReset).toBe(true);
});

test('disabled fields do not participate in validation', async () => {
  let isInObject = false;
  const wrapper = mountWithHoc({
    setup() {
      return {
        disabled: false,
        submit: (values: Record<string, any>) => {
          isInObject = 'field' in values;
        },
      };
    },
    template: `
      <ValidationObserver @submit="submit" as="form">
        <ValidationProvider rules="required" name="field" as="input" :disabled="disabled"/>

        <button id="submit">Submit</button>
      </ValidationObserver>
    `,
  });

  const input = wrapper.find('input');
  input.setValue('123');
  const button = wrapper.find('#submit');

  button.trigger('click');
  await flushPromises();

  expect(isInObject).toBe(true);

  (wrapper as any).disabled = true;
  button.trigger('click');
  await flushPromises();

  expect(isInObject).toBe(false);
});

test('initial values can be set with initialValues prop', async () => {
  const initialValues = {
    field: 'hello',
  };
  const wrapper = mountWithHoc({
    setup() {
      return {
        initialValues,
      };
    },
    template: `
      <ValidationObserver :initialValues="initialValues" @submit="submit" as="form">
        <ValidationProvider rules="required" name="field" as="input" />

        <button id="submit">Submit</button>
      </ValidationObserver>
    `,
  });

  const input = wrapper.find('input');

  expect(input.element.value).toBe(initialValues.field);
});
