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
`search` (query): [Optional] filter transactions by reason text  
`user` (query): [Optional] filter transactions by this user

### Response

```ts
{
	page: number,
	pageCount: number,
	docCount: number,
	transactions: ITransactionAPIResponse[]
}
```

see [db schema](src/types/db.ts) for `ITransactionAPIResponse`

## POST `/transactions`

Create a transaction. Requires staff role.

### Request

`amount` (body): Amount to send  
`reason` (body): [Optional] Reason for the transaction  
`user` (body): User ID or array of user IDs

### Response

Array of transactions

## POST `/transactions/bulk`

Bulk create transactions. Requires bulk send role.

### Request

Body should be sent as `multipart/formdata`

`amount` (body): Amount to send  
`fromUser` (body): [Optional] User ID to send these transactions from. Either this or `fromText` must be specified, but not both.  
`fromText` (body): [Optional] Text to send these transactions from. Either this or `fromUser` must be specified, but not both.
`reason` (body): Reason for the transaction
`data` (body): CSV or Excel document of the users to send these transactions to.

The file's first column can have any header and should contain the student IDs. Any subsequent columns are ignored.

### Response

Array of transactions

## DELETE `/transactions/:id`

Delete a transaction.
Staff can delete their own transactions within the last 24 hours.
Admins can delete any transaction.

### Request

None

### Response

None

# Store

## GET `/store`

Get a list of stores that you have access to.

## Request

`search` (query): [Optional] search for stores by name or description. Requires admin role.  
`user` (query): [Optional] search as a different user. Requires admin role.

### Response

`classIDs`, `managers`, `users`, and `owner` will only be returned if you can manage this store.

`IStoreAPIResponse[]` (see [db schema](src/types/db.ts))

## POST `/store`

Create a store. Requires staff permissions.

## Request

`name` (body): The name of the store  
`description` (body): [Optional] The description of the store  
`classIDs` (body): [Optional] An array of Google Classroom IDs  
`public` (body): Whether the store is public or not. Public stores require admin permissions.  
`pinned` (body): Whether the store is pinned or not. Pinned stores require admin permissions. The store must be public to be pinned.  
`allowDeductions` (body): Whether deductions are allowed when selling items. Changing this setting requires admin permissions.  
`managers` (body): An array of user IDs who can manage this store  
`users` (body): An array of user IDs who can access this store

### Response

`classIDs`, `managers`, `users`, and `owner` will only be returned if you can manage this store.

`IStoreAPIResponse` (see [db schema](src/types/db.ts))

## GET `/store/newarrivals`

Get a list of new store items

### Request

None

### Response

`IStoreItem[]` (see [db schema](src/types/db.ts))

## GET `/store/:id`

Get a store's info by its ID

### Request

`:id` (path): Store ID

### Response

`classIDs`, `managers`, `users`, and `owner` will only be returned if you can manage this store.

`IStoreAPIResponse` (see [db schema](src/types/db.ts))

## PATCH `/store/:id`

Update a store. Requires permission to manage this store.

## Request

`:id` (path): Store ID  
`name` (body): The name of the store  
`description` (body): [Optional] The description of the store  
`classIDs` (body): [Optional] An array of Google Classroom IDs  
`public` (body): Whether the store is public or not. Changing this setting requires admin permissions.  
`pinned` (body): Whether the store is pinned or not. Changing this setting require admin permissions. The store must be public to be pinned.  
`allowDeductions` (body): Whether deductions are allowed when selling items. Changing this setting requires admin permissions.  
`managers` (body): An array of user IDs who can manage this store  
`users` (body): An array of user IDs who can access this store  
`owner` (body): [Optional] The user ID of the new owner of the store. Changing this setting requires admin permissions or you to be the existing owner.

### Response

`IStoreAPIResponse` (see [db schema](src/types/db.ts))

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

## POST `/store/:id/sell`

Sell an item

### Request

`:id` (path): Store ID  
`user` (body): The user ID of the person buying the item  
`item` (body): The ID of the item being sold  
`quantity` (body): [Optional] The quantity of the item being sold  
`deduct` (body): [Optional] Deduct this amount from the price, for example if the user is partially paying in cash.

### Response

None

## GET `/store/:id/items`

Get a list of a store's items

### Request

`:id` (path): Store ID

### Response

`IStoreItem[]` (see [db schema](src/types/db.ts))

## GET `/store/:storeID/item/:id`

Get a store's item by its ID

### Request

`:storeID` (path): Store ID  
`:id` (path): Item ID

### Response

`IStoreItem` (see [db schema](src/types/db.ts))

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
`pinned` (body): [Optional] New pinned status

### Response

`IStoreItem` (see [db schema](src/types/db.ts))

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
`quantity` (body): [Optional] Quantity
`pinned` (body): [Optional] Pinned status

### Response

`IStoreItem` (see [db schema](src/types/db.ts))

## GET `/store/requests`

Get a list of your requests

### Request

None

### Response

`IStoreRequestAPIResponse[]` (see [db schema](src/types/db.ts))

## GET `/store/requests/:id`

Get a list of pending requests for a store. You must be a manager of the store.

### Request

`:id` (path): Store ID

### Resposne

`IStoreRequestAPIResponse[]` (see [db schema](src/types/db.ts))

## POST `/store/request`

Create store request

### Request

`store` (body): Store ID  
`item` (body): Item ID  
`quantity` (body): [Optional] Quantity to purchase

### Response

`IStoreRequestAPIResponse` (see [db schema](src/types/db.ts))

## POST `/store/request/:id`

Approve a request. You must be a manager of the store.

### Request

`:id` (path): Request ID

### Response

`IStoreRequestAPIResponse` (see [db schema](src/types/db.ts))

## DELETE `/store/request/:id`

Deny/Cancel a request. You must be a manager of the store or the person who created the request.

### Request

`:id` (path): Request ID

### Response

`IStoreRequestAPIResponse` (see [db schema](src/types/db.ts))

# Users

## GET `/users/search`

Search for users

### Request

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

## GET `/users/:id`

Get info for authenticated user. Requires admin role for retrieving other users.

### Request

`:id` (path): The user to get, or `me` to get for the authenticated user

### Response

`IUserAPIResponse` (see [db schema](src/types/db.ts))

## PATCH `/users/:id`

Update a user

### Request

`:id` (path): The user to update  
`name` (body): Name  
`googleID` (body): Google ID  
`email` (body): [Optional] Email address  
`schoolID` (body): [Optional] School ID  
`balance` (body): Balance  
`balanceExpires` (body): [Optional] Balance expiry date (ISO or epoch MS)  
`weeklyBalanceMultiplier` (body): [Optional] Weekly balance multiplier  
`roles` (body): [Optional] Roles to give to the user as an arry of strings  
`doNotSync` (body): [Optional] Do not sync this user with Google Admin

### Response

`IUserAPIResponse` (see [db schema](src/types/db.ts))

## DELETE `/users/:id`

Delete a user

### Request

`:id` (path): The user to update

### Response

Nothing

## POST `/users`

Create a user

### Request

`name` (body): Name  
`googleID` (body): Google ID  
`email` (body): [Optional] Email address  
`schoolID` (body): [Optional] School ID  
`balance` (body): [Optional] Balance  
`balanceExpires` (body): [Optional] Balance expiry date (ISO or epoch MS)  
`weeklyBalanceMultiplier` (body): [Optional] Weekly balance multiplier  
`roles` (body): [Optional] Roles to give to the user as an arry of strings  
`doNotSync` (body): [Optional] Do not sync this user with Google Admin

### Response

`IUserAPIResponse` (see [db schema](src/types/db.ts))

## GET `/users/sync`

Start a request to sync users with Google Admin.

### Request

None

### Response

None
