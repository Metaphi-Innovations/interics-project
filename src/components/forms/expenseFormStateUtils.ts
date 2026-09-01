/** Sort canonical active vendors for expense dropdowns. */
export function sortActiveVendorOptions<T extends { id: string; name: string }>(vendors: T[]): T[] {
  return [...vendors].sort((a, b) => a.name.localeCompare(b.name))
}

/** Project build vendors as select options (Paid By, etc.). */
export function buildVendorSelectOptions(
  buildVendors: Array<{ vendorId: string; vendorName: string }>,
): Array<{ id: string; name: string }> {
  return buildVendors
    .map((v) => ({ id: v.vendorId, name: v.vendorName }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Clear a project-scoped vendor selection when the vendor is not on the build vendor list. */
export function vendorIdAfterBuildVendorChange(
  vendorId: string,
  buildVendorIds: string[],
): string {
  if (!vendorId) return ''
  return buildVendorIds.includes(vendorId) ? vendorId : ''
}

/** @deprecated Alias for {@link vendorIdAfterBuildVendorChange} — Paid By uses the same rule. */
export const paidByVendorIdAfterBuildVendorChange = vendorIdAfterBuildVendorChange

/** Whether selecting a different project should reset project-dependent live expense fields. */
export function shouldResetLiveProjectDependentFields(
  previousProjectId: string | undefined,
  nextProjectId: string,
): boolean {
  if (previousProjectId === undefined) return false
  return previousProjectId !== nextProjectId
}
