// Gradient backgrounds (using your primary palette)
export const gradientBgBase = "bg-gradient-to-tr";
export const gradientBgPrimary = `${gradientBgBase} from-[var(--primary-color)] via-[var(--secondary-color)] to-[var(--tertiary-color)]`;
export const gradientBgAccent = `${gradientBgBase} from-[var(--accent)] via-yellow-600 to-yellow-500`;

// Backgrounds
export const colorsBgLight = {
  white: "bg-white text-black",
  primary: "bg-[var(--primary-color)] text-white",
  secondary: "bg-[var(--secondary-color)] text-white",
  tertiary: "bg-[var(--tertiary-color)] text-white",
  accent: "bg-[var(--accent)] text-black",
  info: "bg-blue-50 text-blue-800",
  success: "bg-green-50 text-green-800",
  warning: "bg-yellow-50 text-yellow-800",
  danger: "bg-red-50 text-red-800",
};

// Text
export const colorsText = {
  white: "text-black dark:text-slate-100",
  primary: "text-[var(--primary-color)]",
  secondary: "text-[var(--secondary-color)]",
  tertiary: "text-[var(--tertiary-color)]",
  accent: "text-[var(--accent)]",
  contrast: "dark:text-white",
  info: "text-blue-600",
  success: "text-green-600",
  warning: "text-yellow-600",
  danger: "text-red-600",
};

// Outlines
export const colorsOutline = {
  primary: [colorsText.primary, "border-[var(--primary-color)]"],
  secondary: [colorsText.secondary, "border-[var(--secondary-color)]"],
  tertiary: [colorsText.tertiary, "border-[var(--tertiary-color)]"],
  accent: [colorsText.accent, "border-[var(--accent)]"],
  info: [colorsText.info, "border-blue-600"],
  success: [colorsText.success, "border-green-600"],
  warning: [colorsText.warning, "border-yellow-600"],
  danger: [colorsText.danger, "border-red-600"],
};

// Dynamic Button Colors
export const getButtonColor = (
  color,
  isOutlined,
  hasHover,
  isActive = false
) => {
  const colors = {
    ring: {
      primary: "ring-[var(--primary-color)]/40",
      secondary: "ring-[var(--secondary-color)]/40",
      tertiary: "ring-[var(--tertiary-color)]/40",
      accent: "ring-[var(--accent)]/40",
      info: "ring-blue-500/40",
      success: "ring-green-500/40",
      warning: "ring-yellow-500/40",
      danger: "ring-red-500/40",
    },
    active: {
      primary: "bg-[var(--tertiary-color)] text-white",
      secondary: "bg-[var(--primary-color)] text-white",
      tertiary: "bg-[var(--secondary-color)] text-white",
      accent: "bg-[var(--accent)] text-black",
      info: "bg-blue-700 text-white",
      success: "bg-green-700 text-white",
      warning: "bg-yellow-600 text-black",
      danger: "bg-red-700 text-white",
    },
    bg: {
      primary: "bg-[var(--primary-color)] text-white",
      secondary: "bg-[var(--secondary-color)] text-white",
      tertiary: "bg-[var(--tertiary-color)] text-white",
      accent: "bg-[var(--accent)] text-black",
      info: "bg-blue-600 text-white",
      success: "bg-green-600 text-white",
      warning: "bg-yellow-500 text-black",
      danger: "bg-red-600 text-white",
    },
    bgHover: {
      primary: "hover:bg-[var(--tertiary-color)]",
      secondary: "hover:bg-[var(--primary-color)]",
      tertiary: "hover:bg-[var(--secondary-color)]",
      accent: "hover:bg-yellow-600",
      info: "hover:bg-blue-700",
      success: "hover:bg-green-700",
      warning: "hover:bg-yellow-600",
      danger: "hover:bg-red-700",
    },
    borders: {
      primary: "border-[var(--primary-color)]",
      secondary: "border-[var(--secondary-color)]",
      tertiary: "border-[var(--tertiary-color)]",
      accent: "border-[var(--accent)]",
      info: "border-blue-600",
      success: "border-green-600",
      warning: "border-yellow-500",
      danger: "border-red-600",
    },
    text: {
      primary: "text-[var(--primary-color)]",
      secondary: "text-[var(--secondary-color)]",
      tertiary: "text-[var(--tertiary-color)]",
      accent: "text-[var(--accent)]",
      info: "text-blue-600",
      success: "text-green-600",
      warning: "text-yellow-600",
      danger: "text-red-600",
    },
    outlineHover: {
      primary: "hover:bg-[var(--primary-color)] hover:text-white",
      secondary: "hover:bg-[var(--secondary-color)] hover:text-white",
      tertiary: "hover:bg-[var(--tertiary-color)] hover:text-white",
      accent: "hover:bg-[var(--accent)] hover:text-black",
      info: "hover:bg-blue-600 hover:text-white",
      success: "hover:bg-green-600 hover:text-white",
      warning: "hover:bg-yellow-500 hover:text-black",
      danger: "hover:bg-red-600 hover:text-white",
    },
  };

  if (!colors.bg[color]) return color;

  const isOutlinedProcessed = isOutlined;
  const base = [colors.borders[color], colors.ring[color]];

  if (isActive) {
    base.push(colors.active[color]);
  } else {
    base.push(isOutlinedProcessed ? colors.text[color] : colors.bg[color]);
  }

  if (hasHover) {
    base.push(
      isOutlinedProcessed ? colors.outlineHover[color] : colors.bgHover[color]
    );
  }

  return base;
};
