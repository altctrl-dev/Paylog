# User Management Scripts

## Create User Script

Creates a new user in the database with proper password hashing.

### Local Development

```bash
npm run user:create
```

Follow the prompts to enter:
- Email address
- Full name
- Password (min 8 characters)
- Role (super_admin/admin/manager/associate)

### Production (Railway)

To create a user in your Railway production database:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Run the create user script on Railway
railway run npm run user:create
```

## User Roles

- **super_admin**: Full access to everything including user management
- **admin**: Can approve/reject invoices, manage master data
- **manager**: Can create and edit invoices, view reports
- **associate**: Can create invoices, limited access

## Example

```bash
$ npm run user:create

🔐 PayLog - Create New User

Email address: admin@paylog.com
Full name: Admin User
Password (min 8 chars): ********
Role (super_admin/admin/manager/associate) [super_admin]: super_admin

⏳ Hashing password...
⏳ Creating user...

✅ User created successfully!

User Details:
─────────────
ID: 1
Email: admin@paylog.com
Name: Admin User
Role: super_admin
Active: true

🎉 You can now login at:
https://paylog-production.up.railway.app/login
```
