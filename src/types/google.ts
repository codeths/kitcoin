enum ClassroomRolesEnum {
	'TEACHER',
	'STUDENT',
	'ANY',
}
export type ClassroomRoles = keyof typeof ClassroomRolesEnum;

export function isValidClassroomRole(role: unknown): role is ClassroomRoles {
	return (
		typeof role == 'string' &&
		Object.keys(ClassroomRolesEnum).includes(role)
	);
}
