import { rejectWithBody } from "@/api/createClient";

/**
 * The error a view really meets from an API call: what the client's response interceptor rejects with (the response
 * body, the status kept as `httpStatus`), built by the client's own function — never an axios-shaped guess.
 */
export const clientError = (status, data) => rejectWithBody({ response: { status, data } }).catch((body) => body);
