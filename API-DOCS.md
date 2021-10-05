# API Docs

> All endpoints are located on `/api`

> `user` or `id` refers to the document ID in the database

## GET `/transactions/:user`

Returns all transactions for a user. Requires staff role for retrieving other users' transactions.

### Params

`:user` (path): The user to get transactions for, or `me` to get for the authenticated user

`count` (query): [Optional] the number of transactions to return. Defaults to 10

`page` (query): [Optional] the page of transactions to return. Defaults to 1

### Returns

Array of transactions

## GET `/balance/:user`

Get the balance for a user. Requires staff role for retrieving other users' transactions.

### Params

`:user` (path): The user to get transactions for, or `me` to get for the authenticated user

### Returns

The user's balance

```ts
{
	balance: number;
}
```

## GET `/classes`

Get a list of classes you are teaching in Google classroom. Requires staff role.

### Params

None

### Returns

Array of classes

```ts
{
	id: string;
	name: string | null;
	section: string | null;
}
[];
```

### GET `/students/:class`

Get a list of students in a class. Requires staff role.

### Params

`:class`: The class ID to get students for. Find using `/classes`

### Returns

Array of students

```ts
{
	id: string;
	name: string | null;
}
[];
```

### POST `/transactions`

Create a transaction. Requires staff role.

### Params

Body:

```ts
{
	amount: number;
	reason: string | null;
	user: string; // User ID
}
```

### Returns

Transaction object

## PATCH `/roles`

Update a user's roles. Requires admin role.

### Params

Body:

```ts
{
	user: string; // User ID
	roles: ("NONE" | "STUDENT" | "STAFF" | "ADMIN" | "ALL")[];
}
```

### Returns

User object

## GET `/me`

Get info for authenticated user

### Params

None

### Returns

```ts
{
	name: string;
	email: string;
	id: string;
}
```
