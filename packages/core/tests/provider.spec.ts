import flushPromises from 'flush-promises';
import { extend } from '@vee-validate/core';
import { mountWithHoc } from './helpers';

const DEFAULT_REQUIRED_MESSAGE = (name: string) => `The ${name} field is required`;

test('renders the as prop', () => {
  const wrapper = mountWithHoc({
    template: `
      <ValidationProvider name="field" as="input" />
    `,
  });

  expect(wrapper.html()).toBe(`<input name="field">`);
});

test('listens for input and blur events to set meta flags', async () => {
  const wrapper = mountWithHoc({
    template: `
      <div>
        <ValidationProvider name="field" rules="required" v-slot="{ errors, field, meta }">
          <input v-bind="field" type="text">
          <pre id="pre">{{ meta }}</pre>
        </ValidationProvider>
      </div>
    `,
  });

  const input = wrapper.find('input');
  const pre = wrapper.find('pre');

  expect(pre.text()).toContain('"untouched": true');
  expect(pre.text()).toContain('"pristine": true');
  input.trigger('blur');
  await flushPromises();
  expect(pre.text()).toContain('"touched": true');
  expect(pre.text()).toContain('"untouched": false');
  expect(pre.text()).toContain('"pristine": true');
  input.trigger('input');
  await flushPromises();
  // eslint-disable-next-line jest/valid-expect
  expect(pre.text()).toContain('"pristine": false');
  expect(pre.text()).toContain('"dirty": true');
});

test('listens for change events', async () => {
  const wrapper = mountWithHoc({
    template: `
      <ValidationObserver as="form" v-slot="{ errors }">
        <ValidationProvider name="select" as="select" rules="required">
          <option value="">0</option>
          <option value="1">1</option>
        </ValidationProvider>
        <span id="error">{{ errors.select }}</span>
      </ValidationObserver>
    `,
  });

  const select = wrapper.find('select');
  const error = wrapper.find('#error');

  select.setValue('');
  await flushPromises();
  // validation triggered on change.
  expect(error.text()).toBe(DEFAULT_REQUIRED_MESSAGE('select'));

  select.setValue('1');
  await flushPromises();

  expect(error.text()).toBe('');
});

test('validates initially with immediate prop', async () => {
  const wrapper = mountWithHoc({
    template: `
      <div>
        <ValidationProvider name="field" immediate rules="required" v-slot="{ field, errors }">
          <input v-bind="field" type="text">
          <span id="error">{{ errors[0] }}</span>
        </ValidationProvider>
      </div>
    `,
  });

  const error = wrapper.find('#error');

  // flush the pending validation.
  await flushPromises();

  expect(error.text()).toContain(DEFAULT_REQUIRED_MESSAGE('field'));
});

test('watches rules and re-validates', async () => {
  const wrapper = mountWithHoc({
    setup() {
      return {
        rules: { required: true },
      };
    },
    template: `
        <div>
          <ValidationProvider name="field" :rules="rules" v-slot="{ field, errors }">
            <input v-bind="field" type="text">
            <span id="error">{{ errors[0] }}</span>
          </ValidationProvider>
        </div>
      `,
  });

  const input = wrapper.find('input');
  const error = wrapper.find('#error');
  input.setValue('1');
  // flush the pending validation.
  await flushPromises();

  expect(error.text()).toBe('');

  (wrapper as any).rules = {
    required: false,
    min: 3,
  };

  await flushPromises();
  expect(error.text()).toBe('The field field must be at least 3 characters');
});

test('validates custom components', async () => {
  const wrapper = mountWithHoc({
    components: {
      TextInput: {
        props: ['value'],
        template: `
            <div>
              <input id="input" :value="value" @input="$emit('input', $event.target.value)">
            </div>
          `,
      },
    },
    template: `
        <div>
          <ValidationProvider name="field" rules="required" v-slot="{ field, errors }">
            <TextInput ref="input" v-bind="field" />
            <span id="error">{{ errors && errors[0] }}</span>
          </ValidationProvider>
        </div>
      `,
  });

  const error = wrapper.find('#error');
  const input = wrapper.find('#input');

  expect(error.text()).toBe('');

  input.setValue('');
  await flushPromises();

  expect(error.text()).toBe(DEFAULT_REQUIRED_MESSAGE('field'));

  input.setValue('val');
  await flushPromises();
  expect(error.text()).toBe('');
});

test('validates target fields using targeted params', async () => {
  const wrapper = mountWithHoc({
    template: `
      <ValidationObserver as="form">
        <ValidationProvider rules="required" name="confirmation" as="input" />

        <ValidationProvider name="password" rules="required|confirmed:@confirmation" v-slot="{ field, errors }">
          <input type="password" v-bind="field">
          <span id="err">{{ errors[0] }}</span>
        </ValidationProvider>
      </ValidationObserver>
    `,
  });

  const error = wrapper.find('#err');
  const inputs = wrapper.findAll('input');

  expect(error.text()).toBeFalsy();
  inputs[0].setValue('val');
  await flushPromises();
  // the password input hasn't changed yet.
  expect(error.text()).toBeFalsy();
  inputs[1].setValue('12');
  await flushPromises();
  // the password input was interacted with and should be validated.
  expect(error.text()).toBeTruthy();

  inputs[1].setValue('val');
  await flushPromises();
  // the password input now matches the confirmation.
  expect(error.text()).toBeFalsy();

  inputs[0].setValue('val1');
  await flushPromises();
  expect(error.text()).toBeTruthy();
});

test('validates file input', async () => {
  const wrapper = mountWithHoc({
    template: `
      <div>
        <ValidationProvider rules="required|image" v-slot="{ field, errors }">
          <input type="file" v-bind="field">
          <p id="error">{{ errors[0] }}</p>
        </ValidationProvider>
      </div>
    `,
  });

  const input = wrapper.find('input');
  input.trigger('change');
  await flushPromises();

  const error = wrapper.find('#error');
  expect(error.text()).toBeTruthy();
});

test('setting bails prop to false disables fast exit', async () => {
  const wrapper = mountWithHoc({
    template: `
      <div>
        <ValidationProvider :bails="false" name="field" rules="email|min:3" v-slot="{ field, errors }">
          <input v-bind="field" type="text">
          <p v-for="error in errors">{{ error }}</p>
        </ValidationProvider>
      </div>
    `,
  });

  const input = wrapper.find('input');
  input.setValue('1');
  await flushPromises();

  const errors = wrapper.findAll('p');
  expect(errors).toHaveLength(2);
  expect(errors[0].text()).toBe('The field field must be a valid email');
  expect(errors[1].text()).toBe('The field field must be at least 3 characters');
});

const sleep = (wait: number) => new Promise(resolve => setTimeout(resolve, wait));

test.skip('validation can be debounced', async () => {
  const wrapper = mountWithHoc({
    template: `
      <div>
        <ValidationProvider name="field" rules="required" :debounce="50" v-slot="{ field, errors }">
          <input v-bind="field" type="text">
          <p>{{ errors[0] }}</p>
        </ValidationProvider>
      </div>
    `,
  });

  const input = wrapper.find('input');
  const error = wrapper.find('p');

  input.setValue('');
  await sleep(40);
  expect(error.text()).toBe('');
  await sleep(10);
  await flushPromises();
  expect(error.text()).toBe(DEFAULT_REQUIRED_MESSAGE('field'));
});

test('avoids race conditions between successive validations', async () => {
  // A decreasing timeout (the most recent validation will finish before new ones).
  extend('longRunning', {
    message: 'Lost in time',
    validate: value => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(value === 42);
        }, 20);
      });
    },
  });

  const wrapper = mountWithHoc({
    template: `
      <div>
        <ValidationProvider name="field" rules="required|longRunning" :debounce="10" v-slot="{ field, errors }">
          <input v-bind="field" type="text">
          <p>{{ errors[0] }}</p>
        </ValidationProvider>
      </div>
    `,
  });

  const input = wrapper.find('input');
  const error = wrapper.find('p');

  input.setValue('123');
  input.setValue('12');
  input.setValue('');
  await sleep(100);
  await flushPromises();
  // LAST message should be the required one.
  expect(error.text()).toBe(DEFAULT_REQUIRED_MESSAGE('field'));
});

test('resets validation state using reset method in slot scope data', async () => {
  const wrapper = mountWithHoc({
    template: `
      <div>
        <ValidationProvider name="field" rules="required" v-slot="{ field, errors, reset }">
          <input type="text" v-bind="field">
          <span id="error">{{ errors && errors[0] }}</span>
          <button @click="reset">Reset</button>
        </ValidationProvider>
      </div>
    `,
  });

  const error = wrapper.find('#error');
  const input = wrapper.find('input');

  expect(error.text()).toBe('');

  input.setValue('');
  await flushPromises();

  expect(error.text()).toBe(DEFAULT_REQUIRED_MESSAGE('field'));

  wrapper.find('button').element.click();
  await flushPromises();
  expect(error.text()).toBe('');
});
