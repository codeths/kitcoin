export const ClassroomRolesArray = ['TEACHER', 'STUDENT', 'ANY'] as const;
export type ClassroomRoles = typeof ClassroomRolesArray[number];

export function isValidClassroomRole(role: unknown): role is ClassroomRoles {
	return (
		typeof role == 'string' &&
		ClassroomRolesArray.includes(role as ClassroomRoles)
	);
}
