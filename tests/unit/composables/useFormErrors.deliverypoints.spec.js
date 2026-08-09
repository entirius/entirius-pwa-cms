import { describe, it, expect } from "vitest"
import { extractApiMessage, useFormErrors } from "@/composables/useFormErrors"

// Redmine 33398-2 — "pusty czerwony błąd" przy tworzeniu punktu w panelu Points.
//
// Backend django-deliverypoints (POST /api/deliverypoints/v2/admin/points/) NIE zwraca
// kształtu v2 { details:[{field,description}] }. Zwraca (zweryfikowane w źródle):
//   (A) brak wymaganego pola  → { meta:{...,message:{field:[msg]}}, data:{field:[msg]} }
//   (B) duplikat (type, code) → { detail: "Point with code 'X' already exists for this type." }
// Te testy pilnują, że po naprawie useFormErrors operator dostaje czytelny komunikat
// (per-pole tam gdzie backend podaje pole, i zawsze niepusty toast/summary).

const MISSING_FIELD_BODY = {
  meta: { status: "BAD_REQUEST", status_code: 400, message: { name: ["required"] } },
  data: { name: ["Field required"] },
}

const DUPLICATE_CODE_BODY = {
  detail: "Point with code 'ENG-0001' already exists for this type.",
}

const RAW_DRF_BODY = { name: ["This field is required."], code: ["Enter a valid code."] }

describe("useFormErrors — realne kształty błędów deliverypoints (33398-2)", () => {
  it("(A) brak pola: podświetla pole `name` z niepustym komunikatem", () => {
    const fe = useFormErrors()
    fe.handleApiError({ response: { data: MISSING_FIELD_BODY } })

    const fieldErr = fe.getFieldError("name")
    expect(fieldErr).not.toBeNull()
    expect(fieldErr.status).toBe("error")
    expect(fieldErr.msg).toBe("Field required")
  })

  it("(A) brak pola: toast/summary dostaje niepusty komunikat", () => {
    const fe = useFormErrors()
    fe.handleApiError({ response: { data: MISSING_FIELD_BODY } })
    expect(fe.summary.value).toBeTruthy()
    expect(extractApiMessage({ response: { data: MISSING_FIELD_BODY } })).toBe("Field required")
  })

  it("(B) duplikat code: operator widzi komunikat 'already exists' (toast/summary)", () => {
    const fe = useFormErrors()
    fe.handleApiError({ response: { data: DUPLICATE_CODE_BODY } })
    expect(fe.summary.value).toContain("already exists")
    expect(extractApiMessage({ response: { data: DUPLICATE_CODE_BODY } })).toContain("already exists")
  })

  it("obsługuje też surowy DRF { field: [msg] } (per-pole)", () => {
    const fe = useFormErrors()
    fe.handleApiError({ response: { data: RAW_DRF_BODY } })
    expect(fe.getFieldError("name").msg).toBe("This field is required.")
    expect(fe.getFieldError("code").msg).toBe("Enter a valid code.")
  })

  it("nigdy nie ustawia pustego msg (guard przeciw pustemu czerwonemu błędowi)", () => {
    const fe = useFormErrors()
    // pole zgłoszone przez backend bez treści (np. description === undefined)
    fe.handleApiError({ response: { data: { details: [{ field: "name", description: "" }] } } })
    const fieldErr = fe.getFieldError("name")
    expect(fieldErr).not.toBeNull()
    expect(fieldErr.msg).toBeTruthy()
  })
})
