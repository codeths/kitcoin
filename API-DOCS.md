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
	id: string;
	name: string | null;
	section: string | null;
}
[];
```

### GET `/students/:class`

Get a list of students in a class. Requires staff role.

### Request

`:class` (path): The class ID to get students for. Find using `/classes`

### Response

Array of students

```ts
{
	googleId: string;
	id: string;
	name: string | null;
}
[];
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

### POST `/transactions`

Create a transaction. Requires staff role.

### Request

Body:

```ts
{
	amount: number;
	reason: string | null;
	user: string;
}
```

### Response

Transaction object

# Store

## Get `/stores`

Get a list of stores that you have access to.

## Request

None

### Response

```ts
{
	_id: string;
	name: string;
	description: string;
	canManage: boolean;
	public: boolean;
	className: string | null;
}
[];
```

## GET `/store/:id`

Get a store's info by its ID

### Request

`:id` (path): Store ID

### Response

```ts
{
	name: string;
	description: string;
	canManage: boolean;
}
```

## GET `/store/:id/items`

Get a list of a store's items

### Request

`:id` (path): Store ID  
`count` (query): [Optional] the number of transactions to return. Defaults to 10  
`page` (query): [Optional] the page of transactions to return. Defaults to 1

### Response

```ts
{
	_id: string;
	name: string;
	description: string;
	quantity: number | null;
	price: number;
}
[];
```

## GET `/store/:storeID/item/:id`

Get a store's item by its ID

### Request

`:storeID` (path): Store ID  
`:id` (path): Item ID

### Response

```ts
{
	_id: string;
	name: string;
	description: string;
	quantity: number | null;
	price: number;
}
```

## GET `/store/:storeID/item/:id/image.png`

Get a store item's image

### Request

`:storeID` (path): Store ID  
`:id` (path): Item ID

### Response

The image if exists (png), otherwise will return a 404

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
	_id: string;
	name: string;
	description: string;
	quantity: number | null;
	price: number;
}
```

## PATCH `/store/:storeID/item/:id/image`

Upload a store's item image

### Request

`:storeID` (path): Store ID  
`:id` (path): Item ID  
Body should contain the image as `image/png` or `image/jpeg` (will be converted to PNG)

### Response

Nothing

## DELETE `/store/:storeID/item/:id`

Delete store's item

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
	_id: string;
	name: string;
	description: string;
	quantity: number | null;
	price: number;
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

## GET `/me`

Get info for authenticated user

### Request

None

### Response

```ts
{
	name: string;
	email: string;
	id: string;
	roles: ("NONE" | "STUDENT" | "STAFF" | "ADMIN" | "ALL")[]
	scopes: string[]
	authorized: boolean; // Valid OAuth Credentials
}
```
