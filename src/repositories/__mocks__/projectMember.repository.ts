/**
 * Mock manual de projectMember.repository.ts.
 *
 * `DuplicateMembershipError` es una clase de dominio real que
 * `projectMember.service.ts` distingue con `instanceof`; se reexporta
 * desde el módulo real (`jest.requireActual`) para que ese `instanceof`
 * siga funcionando cuando los tests lanzan este error simulando una
 * violación de UNIQUE(project_id, user_id).
 */
const actual = jest.requireActual("../projectMember.repository");

export const findMembership = jest.fn();
export const listMembersByProject = jest.fn();
export const createMembership = jest.fn();
export const deleteMembership = jest.fn();
export const DuplicateMembershipError = actual.DuplicateMembershipError;
