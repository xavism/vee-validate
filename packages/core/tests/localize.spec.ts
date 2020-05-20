import flushPromises from 'flush-promises';
import { localize, extend } from '@vee-validate/core';
import { mountWithHoc } from './helpers';

test('can define new locales', async () => {
  localize('ar', {
    messages: {
      required: 'هذا الحقل مطلوب',
    },
  });

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

  expect(error.text()).toContain('هذا الحقل مطلوب');
});

test('can define specific messages for specific fields', async () => {
  localize('en', {
    fields: {
      test: {
        required: 'WRONG!',
      },
    },
  });

  const wrapper = mountWithHoc({
    template: `
        <div>
          <ValidationProvider name="test" :immediate="true" rules="required" v-slot="{ field, errors }">
            <input v-bind="field" type="text">
            <span class="error">{{ errors[0] }}</span>
          </ValidationProvider>

          <ValidationProvider name="name" :immediate="true" rules="required" v-slot="{ field, errors }">
            <input v-bind="field" type="text">
            <span class="error">{{ errors[0] }}</span>
          </ValidationProvider>
        </div>
      `,
  });

  await flushPromises();
  const errors = wrapper.findAll('.error');
  expect(errors).toHaveLength(2);

  expect(errors[0].text()).toContain('WRONG!');
  expect(errors[1].text()).toContain('The name field is required');
});

test('can merge locales without setting the current one', async () => {
  localize({
    ar: {
      messages: {
        required: 'هذا الحقل مطلوب',
      },
    },
  });

  const wrapper = mountWithHoc({
    template: `
        <div>
          <ValidationProvider name="field" :immediate="true" rules="required" v-slot="{ field, errors }">
            <input v-bind="field" type="text">
            <span id="error">{{ errors[0] }}</span>
          </ValidationProvider>
        </div>
      `,
  });

  const error = wrapper.find('#error');
  // flush the pending validation.
  await flushPromises();

  // locale wasn't set.
  expect(error.text()).toContain('The field field is required');
});

test('falls back to the default message if rule without message exists', async () => {
  extend('i18n', () => false);

  const wrapper = mountWithHoc({
    template: `
      <div>
        <ValidationProvider name="field" rules="required|i18n" v-slot="{ field, errors }">
          <input v-bind="field" type="text">
          <span id="error">{{ errors[0] }}</span>
        </ValidationProvider>
      </div>
    `,
  });

  const error = wrapper.find('#error');
  const input = wrapper.find('input');
  input.setValue('12');
  await flushPromises();

  expect(error.text()).toContain('field is not valid');
});
