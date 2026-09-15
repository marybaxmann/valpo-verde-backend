/**
 * Mock manual de userProfile.repository.ts.
 *
 * `findUserProfileById` se stubea (accede a Supabase en el módulo real).
 * `extractRoleName` es una función pura (normaliza `role` como objeto o
 * arreglo) sin acceso a datos: se reexporta la implementación real vía
 * `jest.requireActual` para no reimplementarla en el mock.
 */
const actual = jest.requireActual("../userProfile.repository");

export const findUserProfileById = jest.fn();
export const extractRoleName = actual.extractRoleName;
