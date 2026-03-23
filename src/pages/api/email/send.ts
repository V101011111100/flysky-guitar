import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import nodemailer from 'nodemailer';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { to, template_key, variables } = await request.json();

    if (!to || !template_key) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get enabled email provider
    const { data: emailSettings, error: settingsError } = await supabase
      .from('email_settings')
      .select('*')
      .eq('enabled', true)
      .single();

    if (settingsError || !emailSettings) {
      return new Response(
        JSON.stringify({ success: false, error: 'No email provider configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', template_key)
      .single();

    if (templateError || !template) {
      return new Response(
        JSON.stringify({ success: false, error: 'Template not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Replace variables in subject and body
    let subject = template.subject;
    let bodyHtml = template.body_html;
    let bodyText = template.body_text || '';

    if (variables) {
      Object.keys(variables).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, variables[key]);
        bodyHtml = bodyHtml.replace(regex, variables[key]);
        bodyText = bodyText.replace(regex, variables[key]);
      });
    }

    // Send email based on provider
    let emailSent = false;
    let errorMessage = '';

    if (emailSettings.provider === 'smtp' || emailSettings.provider === 'gmail') {
      try {
        const config = emailSettings.config as any;
        
        const transporter = nodemailer.createTransport({
          host: config.host,
          port: config.port,
          secure: config.secure || false,
          auth: {
            user: config.auth.user,
            pass: config.auth.pass,
          },
        });

        await transporter.sendMail({
          from: `${config.from_name} <${config.from_email}>`,
          to,
          subject,
          html: bodyHtml,
          text: bodyText,
        });

        emailSent = true;
      } catch (error: any) {
        errorMessage = error.message;
      }
    } else if (emailSettings.provider === 'sendgrid') {
      // SendGrid implementation
      const config = emailSettings.config as any;
      try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: config.from_email, name: config.from_name },
            subject,
            content: [
              { type: 'text/plain', value: bodyText },
              { type: 'text/html', value: bodyHtml },
            ],
          }),
        });

        if (response.ok) {
          emailSent = true;
        } else {
          errorMessage = await response.text();
        }
      } catch (error: any) {
        errorMessage = error.message;
      }
    } else if (emailSettings.provider === 'resend') {
      // Resend implementation
      const config = emailSettings.config as any;
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${config.from_name} <${config.from_email}>`,
            to: [to],
            subject,
            html: bodyHtml,
            text: bodyText,
          }),
        });

        if (response.ok) {
          emailSent = true;
        } else {
          errorMessage = await response.text();
        }
      } catch (error: any) {
        errorMessage = error.message;
      }
    }

    // Log email
    await supabase.from('email_logs').insert({
      recipient: to,
      subject,
      template_key,
      provider: emailSettings.provider,
      status: emailSent ? 'sent' : 'failed',
      error_message: errorMessage || null,
      metadata: variables || {},
      sent_at: emailSent ? new Date().toISOString() : null,
    });

    if (emailSent) {
      return new Response(
        JSON.stringify({ success: true, message: 'Email sent successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: errorMessage || 'Failed to send email' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
