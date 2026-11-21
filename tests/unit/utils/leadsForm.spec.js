import { describe, it, expect } from "vitest";
import { apiFieldErrors, fieldText, giveText, missingFields } from "@/utils/leadsForm";

// T7 (walk 4): required fields named before the request; an API field error in words, never the raw text.
describe("leads form errors", () => {
  it("names a required field, a field it does not know as 'Fill in this field'", () => {
    expect(giveText("key")).toBe("Give the key");
    expect(giveText("whatever")).toBe("Fill in this field");
  });

  it("lists the empty required fields with their sentence", () => {
    expect(missingFields({ key: " ", label: "Role", options: [] }, ["key", "label", "options"])).toEqual({
      key: "Give the key",
      options: "Give at least one option",
    });
    expect(missingFields({ key: "role" }, ["key"])).toEqual({});
  });

  it("reads known API messages in words, anything else as 'Check this field'", () => {
    expect(fieldText("String should have at least 1 character", "key")).toBe("Give the key");
    expect(fieldText("Ensure this field has no more than 48 characters.", "key")).toBe("Too long — shorten it");
    expect(fieldText("attribute with this key already exists", "key")).toBe("Already in use — pick another");
    expect(fieldText("value is not a valid email address", "email")).toBe("Give a valid e-mail address");
    expect(fieldText("Some internal validator said no", "key")).toBe("Check this field");
    expect(fieldText("", "key")).toBe("");
  });

  it("takes the API's errors of the form's own fields only, in words", () => {
    const details = [{ field: "key", description: "String should have at least 1 character" }, { field: "other", description: "x" }];
    const err = { response: { status: 400, data: { error: "validation_error", message: "Invalid", details } } };
    expect(apiFieldErrors(err, ["key", "label"])).toEqual({ key: "Give the key" });
    expect(apiFieldErrors({ message: "already on the list" }, ["value"])).toEqual({});
  });
});
