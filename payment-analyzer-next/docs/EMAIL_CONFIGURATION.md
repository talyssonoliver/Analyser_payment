# Email Configuration for Supabase Authentication

## Issue: Email Confirmation Not Being Sent

When users sign up, they're not receiving the email confirmation. This is a common issue with Supabase projects and can be resolved by configuring the email settings properly.

## Solution Steps

### 1. Check Supabase Dashboard Settings

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Email Templates**

### 2. Verify Email Settings

1. Go to **Project Settings** → **Auth**
2. Check the following settings:
   - **Enable Email Confirmations**: Should be enabled
   - **Enable Email Change Confirmations**: Should be enabled
   - **Secure Email Change**: Should be enabled

### 3. Configure SMTP (Recommended for Production)

By default, Supabase uses a rate-limited email service. For production, you should configure your own SMTP server:

1. Go to **Project Settings** → **Auth**
2. Scroll down to **SMTP Settings**
3. Enable **Custom SMTP**
4. Configure with your SMTP provider:

#### Example with Gmail:
```
Host: smtp.gmail.com
Port: 587
Username: your-email@gmail.com
Password: your-app-specific-password
Sender email: your-email@gmail.com
Sender name: Payment Analyzer
```

#### Example with SendGrid:
```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: your-sendgrid-api-key
Sender email: noreply@yourdomain.com
Sender name: Payment Analyzer
```

### 4. Update Email Templates

1. Go to **Authentication** → **Email Templates**
2. Customize the confirmation email template:

```html
<h2>Confirm your email</h2>
<p>Welcome to Payment Analyzer!</p>
<p>Please confirm your email address by clicking the link below:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email</a></p>
<p>Or copy and paste this link: {{ .ConfirmationURL }}</p>
```

### 5. Update Auth Configuration in Code

Update the signup method to handle email confirmation properly:

```typescript
// In auth-service.ts, update the signUp method:
async signUp(credentials: SignupCredentials): Promise<AuthResponse> {
  try {
    const { data, error } = await this.getSupabase().auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          display_name: credentials.displayName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    if (error) {
      return { user: null, session: null, error: error.message };
    }
    
    // Check if email confirmation is required
    if (data.user && !data.session) {
      return { 
        user: null, 
        session: null, 
        error: 'Please check your email to confirm your account' 
      };
    }
    
    // ... rest of the code
  } catch (error) {
    // ... error handling
  }
}
```

### 6. Add Email Confirmation Page

Create a page to show after signup:

```typescript
// src/app/(auth)/confirm-email/page.tsx
export default function ConfirmEmailPage() {
  return (
    <div className="max-w-md mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold mb-4">Check Your Email</h1>
      <p className="text-gray-600 mb-4">
        We've sent you an email with a confirmation link. 
        Please check your inbox and click the link to activate your account.
      </p>
      <p className="text-sm text-gray-500">
        Didn't receive the email? Check your spam folder or contact support.
      </p>
    </div>
  );
}
```

### 7. Test Email Delivery

1. Use Supabase's built-in email logs:
   - Go to **Authentication** → **Email Logs**
   - Check if emails are being sent and their status

2. Common issues:
   - Rate limiting (3-4 emails per hour on free tier)
   - Emails going to spam
   - Invalid email addresses

### 8. Alternative: Disable Email Confirmation (Development Only)

For development, you can temporarily disable email confirmation:

1. Go to **Project Settings** → **Auth**
2. Disable **Enable Email Confirmations**
3. Users will be automatically confirmed upon signup

**Warning**: Only do this for development. Email confirmation is important for production security.

## Troubleshooting

### If emails are still not being sent:

1. **Check Supabase service status**: https://status.supabase.com/
2. **Verify your project is not paused**: Check project dashboard
3. **Check email logs**: Authentication → Email Logs
4. **Test with different email providers**: Some providers block automated emails
5. **Use a custom SMTP service**: More reliable than default service

### Recommended SMTP Services:

1. **SendGrid** - 100 emails/day free
2. **Mailgun** - 5,000 emails/month free
3. **Amazon SES** - Very cost-effective for high volume
4. **Postmark** - Great deliverability

## Code Updates Needed

1. Update the signup success message to inform users to check their email
2. Add proper error handling for email confirmation required state
3. Create an email confirmation success page
4. Add resend confirmation email functionality