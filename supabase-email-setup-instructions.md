# Supabase Email Template Setup Instructions

## 📧 Email Templates Created

I've created two professional email templates for your Cutcall Supabase project:

1. **`supabase-email-template.html`** - For email verification (signup)
2. **`supabase-email-template-recovery.html`** - For password recovery

## 🎨 Template Features

### ✨ Design Elements
- **Cutcall branding** with gradient backgrounds matching your app
- **Professional layout** with clear hierarchy
- **Mobile responsive** design for all devices
- **Accessible** with proper contrast and readable fonts
- **Security-focused** messaging and warnings

### 🔧 Technical Features
- **Supabase variables** properly integrated (`{{ .Token }}`, `{{ .Email }}`)
- **Cross-client compatibility** (Gmail, Outlook, Apple Mail, etc.)
- **Inline CSS** for maximum email client support
- **Fallback fonts** for consistent rendering

## 🚀 How to Set Up in Supabase

### Step 1: Access Email Templates
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Email Templates**

### Step 2: Configure Signup Confirmation
1. Select **"Confirm signup"** template
2. Replace the default HTML with the content from `supabase-email-template.html`
3. Set the subject line to: `Your Cutcall verification code`

### Step 3: Configure Password Recovery
1. Select **"Reset password"** template  
2. Replace the default HTML with the content from `supabase-email-template-recovery.html`
3. Set the subject line to: `Reset your Cutcall password`

### Step 4: Test the Templates
1. Use the **"Send test email"** feature in Supabase
2. Check how they render in different email clients
3. Verify the OTP codes display correctly

## 📱 Template Variations

### Signup Verification Email
- **Purple/blue gradient** header matching your app
- **Large, centered OTP code** for easy reading
- **Clear instructions** for next steps
- **Security messaging** about code protection

### Password Recovery Email
- **Red gradient** header to indicate security action
- **Prominent warning** about unauthorized access
- **Step-by-step reset instructions**
- **Enhanced security messaging**

## 🎯 Key Benefits

1. **Brand Consistency** - Matches your Cutcall app design
2. **User Experience** - Clear, professional, and trustworthy
3. **Mobile Optimized** - Looks great on all devices
4. **Security Focused** - Proper warnings and best practices
5. **Accessibility** - High contrast and readable fonts

## 🔧 Customization Options

You can easily customize:
- **Colors** - Update the gradient values in the CSS
- **Logo** - Replace the emoji with an actual logo image
- **Links** - Update footer links to your actual pages
- **Messaging** - Adjust the copy to match your brand voice

## 📋 Variables Used

The templates use these Supabase variables:
- `{{ .Token }}` - The 6-digit OTP code
- `{{ .Email }}` - The recipient's email address

These are automatically populated by Supabase when sending emails.

## ✅ Next Steps

1. Copy the HTML content to your Supabase email templates
2. Test with real email addresses
3. Customize any messaging or styling as needed
4. Monitor email delivery and user feedback

Your users will now receive beautiful, professional emails that match your Cutcall branding! 🎉