import { t } from "@/i18n";
import { pluralKey } from "@/utils/plural";

// The answer of every bulk action of the Leads panel, in one shape: how many rows it changed and, when some were
// refused, how many it did not. `doneKey` is the plural key stem ("…_one/_few/_many"), `notKey` the refusal sentence
// (needed only by an action that can refuse single rows).
export function bulkAnswer({ doneKey, notKey, done, refused = 0, params = {} }) {
  const doneText = t(`${doneKey}_${pluralKey(done)}`, { count: done, ...params });
  const msg = refused ? `${doneText} ${t(notKey, { count: refused })}` : doneText;
  return { msg, type: refused ? "warning" : "positive" };
}
