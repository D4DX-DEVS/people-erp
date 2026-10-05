// Formatting for one line of hero text (a title or a subtitle).
//
// Used by the page builders' hero, the home page hero and the built-in list
// pages' heroes (WebsiteSettings.pageHeroes). Everything is optional: '' means
// "keep the built-in look", and `hidden` removes the line from the public page.
//
// Keep the option lists in sync with HERO_TEXT_* in erp/src/lib/heroText.ts. Each field is
// whitelisted by a setter rather than an enum so a stale or hand-edited value is
// dropped to '' instead of failing the whole page save.

const HERO_TEXT_FONTS = ['display', 'site', 'malayalam', 'serif', 'system'];
const HERO_TEXT_SIZES = ['sm', 'md', 'lg', 'xl'];
const HERO_TEXT_WEIGHTS = ['normal', 'medium', 'semibold', 'bold'];

const oneOf = (allowed) => (value) => (allowed.includes(value) ? value : '');

const heroTextStyle = {
  hidden: { type: Boolean, default: false },
  font: { type: String, default: '', set: oneOf(HERO_TEXT_FONTS) },
  size: { type: String, default: '', set: oneOf(HERO_TEXT_SIZES) },
  weight: { type: String, default: '', set: oneOf(HERO_TEXT_WEIGHTS) },
  // Swatch name or hex (see erp/src/lib/siteColors.ts); '' = the built-in colour.
  color: { type: String, default: '', maxlength: 32, trim: true }
};

module.exports = { heroTextStyle, HERO_TEXT_FONTS, HERO_TEXT_SIZES, HERO_TEXT_WEIGHTS };
