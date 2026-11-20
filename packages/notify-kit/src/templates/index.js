import {
  renderWelcome,
  renderOrderConfirmation,
  renderAccountNotification,
  renderPasswordResetNotification,
  renderCustom
} from "./welcome.js";
import { wrapNotificationLayout } from "./base.js";
import { TemplateError } from "../errors.js";

export {
  wrapNotificationLayout,
  renderWelcome,
  renderOrderConfirmation,
  renderAccountNotification,
  renderPasswordResetNotification,
  renderCustom
};

/**
 * Built-in template registry map.
 */
export const BUILTIN_TEMPLATES = {
  welcome: renderWelcome,
  order_confirmation: renderOrderConfirmation,
  orderConfirmation: renderOrderConfirmation,
  account_notification: renderAccountNotification,
  accountNotification: renderAccountNotification,
  password_reset_notification: renderPasswordResetNotification,
  passwordResetNotification: renderPasswordResetNotification,
  custom: renderCustom
};

/**
 * Resolve a template by name or function.
 * @param {string|Function} template
 * @param {Record<string, Function>} customTemplates
 * @returns {Function}
 */
export function resolveTemplate(template, customTemplates = {}) {
  if (typeof template === "function") {
    return template;
  }
  if (typeof template === "string") {
    if (customTemplates[template]) {
      return customTemplates[template];
    }
    if (BUILTIN_TEMPLATES[template]) {
      return BUILTIN_TEMPLATES[template];
    }
    throw new TemplateError(`Unknown template name: "${template}". Available: ${Object.keys(BUILTIN_TEMPLATES).join(", ")}`);
  }
  throw new TemplateError("Template must be a string name or a render function.");
}

