const verifyEmailTemplate = (userName: string, verifyUrl: string) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
     <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Verify Your Email</title>
     </head>
     <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
       <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 0;">
         <tr>
           <td align="center">
             <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
               
               <!-- Header -->
               <tr>
                 <td align="center" style="padding-bottom: 24px;">
                   <h1 style="margin: 0; font-size: 24px; color: #1a1a1a;">Confirm your email</h1>
                 </td>
               </tr>
     
               <!-- Body -->
               <tr>
                 <td style="font-size: 15px; color: #444444; line-height: 1.6; padding-bottom: 32px;">
                   <p style="margin: 0 0 16px;">Hey <strong>${userName}</strong> 👋</p>
                   <p style="margin: 0 0 16px;">Thanks for signing up! Just one more step — click the button below to verify your email address. This link expires in <strong>5 minutes</strong>.</p>
                   <p style="margin: 0;">If you didn't create an account, you can safely ignore this email.</p>
                 </td>
               </tr>
     
               <!-- CTA Button -->
               <tr>
                 <td align="center" style="padding-bottom: 32px;">
                   <a href="${verifyUrl}"
                     style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: bold;">
                     Verify Email Address
                   </a>
                 </td>
               </tr>
     
               <!-- Fallback link -->
               <tr>
                 <td style="font-size: 13px; color: #888888; padding-bottom: 24px;">
                   Button not working? Copy and paste this link into your browser:<br />
                   <a href="${verifyUrl}" style="color: #4f46e5; word-break: break-all;">${verifyUrl}</a>
                 </td>
               </tr>
     
               <!-- Footer -->
               <tr>
                 <td align="center" style="font-size: 12px; color: #aaaaaa; border-top: 1px solid #eeeeee; padding-top: 24px;">
                   © 2025 YourAppName. All rights reserved.
                 </td>
               </tr>
     
             </table>
           </td>
         </tr>
       </table>
     </body>
    </html>
    `;
};

const resetPasswordTemplate = (userName: string, resetUrl: string) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
     <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset Your Password</title>
     </head>
     <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
       <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 0;">
         <tr>
           <td align="center">
             <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
               
               <!-- Header -->
               <tr>
                 <td align="center" style="padding-bottom: 24px;">
                   <h1 style="margin: 0; font-size: 24px; color: #1a1a1a;">Reset your password</h1>
                 </td>
               </tr>
     
               <!-- Body -->
               <tr>
                 <td style="font-size: 15px; color: #444444; line-height: 1.6; padding-bottom: 32px;">
                   <p style="margin: 0 0 16px;">Hey <strong>${userName}</strong> 👋</p>
                   <p style="margin: 0 0 16px;">We received a request to reset your password. Click the button below to set a new one. This link expires in <strong>15 minutes</strong>.</p>
                   <p style="margin: 0;">If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>
                 </td>
               </tr>
     
               <!-- CTA Button -->
               <tr>
                 <td align="center" style="padding-bottom: 32px;">
                   <a href="${resetUrl}"
                     style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: bold;">
                     Reset Password
                   </a>
                 </td>
               </tr>
     
               <!-- Fallback link -->
               <tr>
                 <td style="font-size: 13px; color: #888888; padding-bottom: 24px;">
                   Button not working? Copy and paste this link into your browser:<br />
                   <a href="${resetUrl}" style="color: #dc2626; word-break: break-all;">${resetUrl}</a>
                 </td>
               </tr>
     
               <!-- Footer -->
               <tr>
                 <td align="center" style="font-size: 12px; color: #aaaaaa; border-top: 1px solid #eeeeee; padding-top: 24px;">
                   © 2025 YourAppName. All rights reserved.
                 </td>
               </tr>
     
             </table>
           </td>
         </tr>
       </table>
     </body>
    </html>
    `;
};

export { verifyEmailTemplate, resetPasswordTemplate };
