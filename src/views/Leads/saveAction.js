import { t } from "@/i18n";

// The one Save of a settings page (N27): in the page header, greyed with "Nothing to save" until something changed.
export const saveAction = ({ dirty, saving = false, testid, onClick }) => ({
  key: "save",
  role: "primary",
  label: t("common.save"),
  disabled: !dirty,
  title: dirty ? undefined : t("unsaved.nothing"),
  loading: saving,
  testid,
  onClick,
});
