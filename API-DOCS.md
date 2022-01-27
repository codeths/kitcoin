# API Docs

> All endpoints are located on `/api`

> `user` or `id` refers to the document ID in the database

# Classroom

## GET `/classes`

Get a list of classes you are teaching in Google classroom.

### Request

`role` (query): [Optional] your role in the classroom. One of: `TEACHER`, `STUDENT`, `ANY` (default: `ANY`)

### Response

Array of classes

```ts
{
	id: string,
	name: string | null,
	section: string | null
}
[],
```

## GET `/students/:class`

Get a list of students in a class. Requires staff role.

### Request

`:class` (path): The class ID to get students for. Find using `/classes`

### Response

Array of students

```ts
{
	googleId: string,
	id: string,
	name: string | null
}
[],
```

# Currency

## GET `/balance/:user`

Get the balance for a user. Requires staff role for retrieving other users' transactions.

### Request

`:user` (path): The user to get transactions for, or `me` to get for the authenticated user

### Response

The user's balance

```ts
{
	balance: number;
}
```

## GET `/transactions/:user`

Returns all transactions for a user. Requires staff role for retrieving other users' transactions.

### Request

`:user` (path): The user to get transactions for, or `me` to get for the authenticated user  
`count` (query): [Optional] the number of transactions to return. Defaults to 10  
`page` (query): [Optional] the page of transactions to return. Defaults to 1  
`search` (query): [Optional] filter transactions by reason text (todo: user search)

### Response

Array of transactions

## POST `/transactions`

Create a transaction. Requires staff role.

### Request

Body:

```ts
{
	amount: number,
	reason: string | null,
	user: string | string[]
}
```

### Response

```ts
{
	page: number,
	pageCount: number,
	docCount: number,
	transactions: ITransactionAPIResponse[]
}
```

## DELETE `/transactions/:id`

Delete a transaction.
Staff can delete their own transactions within the last 24 hours.
Admins can delete any transaction.

### Request

None

### Response

None

# Store

## GET `/stores`

Get a list of stores that you have access to.

## Request

None

### Response

`classIDs`, `managers`, `users`, and `owner` will only be returned if you can manage this store.

```ts
{
	_id: string,
	name: string,
	description: string | null,
	canManage: boolean,
	public: boolean,
	classNames: string[]
	classIDs: string[] | null,
	managers: string[] | null,
	users: string[] | null,
	owner: string | null
}
[],
```

## POST `/stores`

Create a store. Requires staff permissions.

## Request

`name` (body): The name of the store  
`description` (body): [Optional] The description of the store  
`classIDs` (body): [Optional] An array of Google Classroom IDs  
`public` (body): Whether the store is public or not. Public stores require admin permissions.  
`managers` (body): An array of user IDs who can manage this store  
`users` (body): An array of user IDs who can access this store

### Response

```ts
{
	name: string,
	description: string | null,
	classIDs: string[],
	public: boolean,
	owner: string,
	managers: string[],
	users: string[]
}
```

## GET `/store/:id`

Get a store's info by its ID

### Request

`:id` (path): Store ID

### Response

`classIDs`, `managers`, `users`, and `owner` will only be returned if you can manage this store.

```ts
{
	_id: string,
	name: string,
	description: string | null,
	canManage: boolean,
	public: boolean,
	classIDs: string[] | null,
	managers: string[] | null,
	users: string[] | null,
	owner: string | null
}
```

## PATCH `/store/:id`

Update a store. Requires permission to manage this store.

## Request

`:id` (path): Store ID  
`name` (body): The name of the store  
`description` (body): [Optional] The description of the store  
`classIDs` (body): [Optional] An array of Google Classroom IDs  
`public` (body): Whether the store is public or not. Changing this setting requires admin permissions.  
`managers` (body): An array of user IDs who can manage this store  
`users` (body): An array of user IDs who can access this store

### Response

```ts
{
	name: string,
	description: string | null,
	classIDs: string[],
	public: boolean,
	owner: string,
	managers: string[],
	users: string[]
}
```

## DELETE `/store/:id`

Delete a store. Only the store owner or an admin can do this.

## Request

`:id` (path): Store ID

### Response

None

## GET `/store/:id/students`

Get a list of people who can access a store

### Request

`:id` (path): Store ID

### Response

Null or an array of student ids

## GET `/store/:id/items`

Get a list of a store's items

### Request

`:id` (path): Store ID

### Response

```ts
{
	_id: string,
	name: string,
	description: string,
	quantity: number | null,
	price: number,
	imageHash: string | null
}
[],
```

## GET `/store/:storeID/item/:id`

Get a store's item by its ID

### Request

`:storeID` (path): Store ID  
`:id` (path): Item ID

### Response

```ts
{
	_id: string,
	name: string,
	description: string,
	quantity: number | null,
	price: number,
	imageHash: string | null
}
```

## GET `/store/:storeID/item/:id/image`

Get a store item's image

### Request

`:storeID` (path): Store ID  
`:id` (path): Item ID

### Response

The image if exists (webp), otherwise will return a 404

## PATCH `/store/:storeID/item/:id`

Update a store's item

### Request

`:storeID` (path): Store ID  
`:id` (path): Item ID  
`name` (body): [Optional] New name  
`description` (body): [Optional] New description  
`price` (body): [Optional] New price  
`quantity` (body): [Optional] New quantity

### Response

```ts
{
	_id: string,
	name: string,
	description: string,
	quantity: number | null,
	price: number,
	imageHash: string | null
}
```

## PATCH `/store/:storeID/item/:id/image`

Upload a store's item image

### Request

`:storeID` (path): Store ID  
`:id` (path): Item ID  
Body should contain the image as `image/png`, `image/jpeg`, or `image/webp` (will be converted to webp)

### Response

Nothing

## DELETE `/store/:storeID/item/:id`

Delete store's item

### Request

`:storeID` (path): Store ID  
`:id` (path): Item ID

## DELETE `/store/:storeID/item/:id/image`

Delete store's item image

### Request

`:storeID` (path): Store ID  
`:id` (path): Item ID

### Response

Nothing

## POST `/store/:storeID/items`

Create a store item

### Request

`:storeID` (path): Store ID  
`:id` (path): Item ID  
`name` (body): Name  
`description` (body): [Optional] Description  
`price` (body): Price  
`quantity` (body): [Optional] New quantity

### Response

```ts
{
	_id: string,
	name: string,
	description: string,
	quantity: number | null,
	price: number,
	imageHash: null
}
```

# Users

## PATCH `/roles`

Update a user's roles. Requires admin role.

### Request

Body:

```ts
{
	user: string; // User ID
	roles: ("NONE" | "STUDENT" | "STAFF" | "ADMIN" | "ALL")[]
}
```

### Response

User object

## GET `/search`

Search for users

### Request

Body:

`q` (query): Search query  
`roles` (query): [Optional] User must have at least one these roles. Separate multiple roles with a comma.  
`count` (query): [Optional] Number of results to return. Defaults to 10  
`me` (query): [Optional] Include the authenticated user in the results. Defaults to false

### Response

```ts
{
	name: string,
	email: string,
	id: string,
	confidence: number
}
[],
```

## GET `/me`

Get info for authenticated user

### Request

None

### Response

```ts
{
	name: string,
	email: string,
	id: string,
	roles: ("NONE" | "STUDENT" | "STAFF" | "ADMIN" | "ALL")[]
	scopes: string[]
	authorized: boolean; // Valid OAuth Credentials
}
```
