// Native uploads keep their original format; no additional native dependency.
export async function prepareStaffPortrait(data: ArrayBuffer, mimeType: string) {
  return { data, mimeType };
}
