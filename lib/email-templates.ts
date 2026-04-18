// Email template system for GoHighLevel integration

export interface EmailTemplateData {
  [key: string]: unknown
}

export interface EmailTemplate {
  subject: string
  html: string
  text?: string
}

/**
 * Email template generator functions
 */
export class EmailTemplates {
  /**
   * Welcome email for new job seekers
   */
  static welcomeSeeker(data: {
    firstName: string
    email: string
    loginUrl: string
  }): EmailTemplate {
    const { firstName, email, loginUrl } = data

    return {
      subject: `Welcome to AmperTalent, ${firstName}! 🎉`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to AmperTalent</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .highlight { background: #e8f4fd; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to AmperTalent! 👋</h1>
              <p>Your journey to finding the perfect remote job starts here</p>
            </div>
            <div class="content">
              <h2>Hi ${firstName}!</h2>
              
              <p>We're thrilled to have you join our community of talented moms seeking flexible, remote work opportunities!</p>
              
              <div class="highlight">
                <h3>🚀 What's Next?</h3>
                <ul>
                  <li><strong>Complete your profile</strong> - Add your skills, experience, and availability</li>
                  <li><strong>Upload your resume</strong> - Make it easy for employers to find you</li>
                  <li><strong>Browse job opportunities</strong> - Find positions that fit your schedule</li>
                  <li><strong>Consider a membership</strong> - Unlock premium features and priority access</li>
                </ul>
              </div>
              
              <p>Ready to get started?</p>
              
              <a href="${loginUrl}" class="button">Complete Your Profile →</a>
              
              <h3>💡 Pro Tips for Success:</h3>
              <ul>
                <li>Highlight your remote work experience and home office setup</li>
                <li>Be specific about your availability and preferred hours</li>
                <li>Showcase skills that are valuable for remote work (communication, self-management, etc.)</li>
                <li>Keep your profile updated with your latest experience</li>
              </ul>
              
              <p>If you have any questions, don't hesitate to reach out to our support team. We're here to help you succeed!</p>
              
              <p>Best regards,<br>
              The AmperTalent Team</p>
            </div>
            <div class="footer">
              <p>You're receiving this email because you signed up for AmperTalent at ${email}</p>
              <p>© 2025 AmperTalent. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to AmperTalent, ${firstName}!
        
        We're thrilled to have you join our community of talented moms seeking flexible, remote work opportunities!
        
        What's Next?
        - Complete your profile - Add your skills, experience, and availability
        - Upload your resume - Make it easy for employers to find you
        - Browse job opportunities - Find positions that fit your schedule
        - Consider a membership - Unlock premium features and priority access
        
        Get started: ${loginUrl}
        
        Pro Tips for Success:
        - Highlight your remote work experience and home office setup
        - Be specific about your availability and preferred hours
        - Showcase skills that are valuable for remote work
        - Keep your profile updated with your latest experience
        
        If you have any questions, don't hesitate to reach out to our support team.
        
        Best regards,
        The AmperTalent Team
      `
    }
  }

  /**
   * Welcome email for new employers
   */
  static welcomeEmployer(data: {
    firstName: string
    companyName: string
    email: string
    loginUrl: string
  }): EmailTemplate {
    const { firstName, companyName, email, loginUrl } = data

    return {
      subject: `Welcome to AmperTalent, ${companyName}! 🏢`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to AmperTalent</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .highlight { background: #e8f4fd; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to AmperTalent! 🏢</h1>
              <p>Connect with talented moms ready for remote work</p>
            </div>
            <div class="content">
              <h2>Hi ${firstName}!</h2>
              
              <p>Thank you for choosing AmperTalent to find exceptional remote talent for ${companyName}!</p>
              
              <div class="highlight">
                <h3>🚀 Getting Started:</h3>
                <ul>
                  <li><strong>Complete your company profile</strong> - Showcase your culture and values</li>
                  <li><strong>Purchase job posting credits</strong> - Choose the package that fits your needs</li>
                  <li><strong>Post your first job</strong> - Our team will review and approve it</li>
                  <li><strong>Review applications</strong> - Connect with qualified candidates</li>
                </ul>
              </div>
              
              <p>Ready to find your next great hire?</p>
              
              <a href="${loginUrl}" class="button">Complete Your Profile →</a>
              
              <h3>💡 Tips for Attracting Top Talent:</h3>
              <ul>
                <li>Emphasize your remote-first culture and flexibility</li>
                <li>Highlight family-friendly policies and benefits</li>
                <li>Be clear about expectations and communication tools</li>
                <li>Showcase growth opportunities and company values</li>
              </ul>
              
              <p>Our vetting process ensures you only see qualified, motivated candidates who are serious about remote work.</p>
              
              <p>Questions? Our team is here to help you succeed!</p>
              
              <p>Best regards,<br>
              The AmperTalent Team</p>
            </div>
            <div class="footer">
              <p>You're receiving this email because you signed up for AmperTalent at ${email}</p>
              <p>© 2025 AmperTalent. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to AmperTalent, ${companyName}!
        
        Thank you for choosing AmperTalent to find exceptional remote talent!
        
        Getting Started:
        - Complete your company profile - Showcase your culture and values
        - Purchase job posting credits - Choose the package that fits your needs
        - Post your first job - Our team will review and approve it
        - Review applications - Connect with qualified candidates
        
        Get started: ${loginUrl}
        
        Tips for Attracting Top Talent:
        - Emphasize your remote-first culture and flexibility
        - Highlight family-friendly policies and benefits
        - Be clear about expectations and communication tools
        - Showcase growth opportunities and company values
        
        Our vetting process ensures you only see qualified, motivated candidates.
        
        Best regards,
        The AmperTalent Team
      `
    }
  }

  /**
   * Job approved notification for employers
   */
  static jobApproved(data: {
    firstName: string
    jobTitle: string
    jobId: string
    jobUrl: string
    companyName: string
  }): EmailTemplate {
    const { firstName, jobTitle, jobId, jobUrl, companyName } = data

    return {
      subject: `✅ Your job posting "${jobTitle}" has been approved!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Job Approved</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .job-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Job Approved!</h1>
              <p>Your job posting is now live and visible to candidates</p>
            </div>
            <div class="content">
              <h2>Great news, ${firstName}!</h2>
              
              <p>Your job posting has been reviewed and approved by our team. It's now live on our platform and visible to qualified candidates!</p>
              
              <div class="job-details">
                <h3>📋 Job Details:</h3>
                <p><strong>Position:</strong> ${jobTitle}</p>
                <p><strong>Company:</strong> ${companyName}</p>
                <p><strong>Job ID:</strong> ${jobId}</p>
                <p><strong>Status:</strong> ✅ Live and accepting applications</p>
              </div>
              
              <p>Candidates can now view and apply for this position. You'll receive email notifications when new applications come in.</p>
              
              <a href="${jobUrl}" class="button">View Your Job Posting →</a>
              
              <h3>📈 What to Expect:</h3>
              <ul>
                <li>Applications will start coming in within 24-48 hours</li>
                <li>You'll receive email notifications for each new application</li>
                <li>You can review and manage applications in your dashboard</li>
                <li>Our platform helps you identify the most qualified candidates</li>
              </ul>
              
              <p>Thank you for choosing AmperTalent to find your next great team member!</p>
              
              <p>Best regards,<br>
              The AmperTalent Team</p>
            </div>
            <div class="footer">
              <p>© 2025 AmperTalent. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Job Approved!
        
        Great news, ${firstName}!
        
        Your job posting "${jobTitle}" has been reviewed and approved. It's now live on our platform!
        
        Job Details:
        - Position: ${jobTitle}
        - Company: ${companyName}
        - Job ID: ${jobId}
        - Status: Live and accepting applications
        
        View your job posting: ${jobUrl}
        
        What to Expect:
        - Applications will start coming in within 24-48 hours
        - You'll receive email notifications for each new application
        - You can review and manage applications in your dashboard
        
        Thank you for choosing AmperTalent!
        
        Best regards,
        The AmperTalent Team
      `
    }
  }

  /**
   * Job rejected notification for employers
   */
  static jobRejected(data: {
    firstName: string
    jobTitle: string
    rejectionReason: string
    companyName: string
    editUrl: string
  }): EmailTemplate {
    const { firstName, jobTitle, rejectionReason, companyName, editUrl } = data

    return {
      subject: `❌ Job posting "${jobTitle}" needs revision`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Job Needs Revision</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ef4444; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .feedback { background: #fef2f2; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ef4444; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Job Posting Needs Revision</h1>
              <p>Please review and update your job posting</p>
            </div>
            <div class="content">
              <h2>Hi ${firstName},</h2>
              
              <p>Thank you for submitting your job posting for "${jobTitle}" at ${companyName}. After review, our team has identified some areas that need attention before we can approve it.</p>
              
              <div class="feedback">
                <h3>📝 Feedback from our team:</h3>
                <p>${rejectionReason}</p>
              </div>
              
              <p>Don't worry - this is a common part of our quality assurance process to ensure all job postings meet our standards and attract the best candidates.</p>
              
              <a href="${editUrl}" class="button">Edit Your Job Posting →</a>
              
              <h3>💡 Tips for a successful job posting:</h3>
              <ul>
                <li>Be specific about remote work requirements and expectations</li>
                <li>Include clear information about compensation or salary range</li>
                <li>Highlight family-friendly policies and flexible scheduling</li>
                <li>Provide detailed job responsibilities and qualifications</li>
                <li>Mention your company culture and growth opportunities</li>
              </ul>
              
              <p>Once you've made the necessary updates, simply resubmit your job posting for review. We typically review submissions within 24 hours.</p>
              
              <p>If you have any questions about the feedback or need assistance, please don't hesitate to contact our support team.</p>
              
              <p>Best regards,<br>
              The AmperTalent Team</p>
            </div>
            <div class="footer">
              <p>© 2025 AmperTalent. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Job Posting Needs Revision
        
        Hi ${firstName},
        
        Your job posting for "${jobTitle}" at ${companyName} needs some updates before approval.
        
        Feedback from our team:
        ${rejectionReason}
        
        Edit your job posting: ${editUrl}
        
        Tips for success:
        - Be specific about remote work requirements
        - Include clear compensation information
        - Highlight family-friendly policies
        - Provide detailed responsibilities and qualifications
        - Mention company culture and growth opportunities
        
        Resubmit after making updates - we review within 24 hours.
        
        Best regards,
        The AmperTalent Team
      `
    }
  }

  /**
   * New application notification for employers
   */
  static newApplication(data: {
    firstName: string
    jobTitle: string
    candidateName: string
    applicationUrl: string
    companyName: string
  }): EmailTemplate {
    const { firstName, jobTitle, candidateName, applicationUrl, companyName } = data

    return {
      subject: `🎯 New application for "${jobTitle}" from ${candidateName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Application</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .application-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3b82f6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 New Application!</h1>
              <p>A qualified candidate has applied to your job posting</p>
            </div>
            <div class="content">
              <h2>Hi ${firstName},</h2>
              
              <p>Great news! You've received a new application for your job posting.</p>
              
              <div class="application-details">
                <h3>📋 Application Details:</h3>
                <p><strong>Position:</strong> ${jobTitle}</p>
                <p><strong>Company:</strong> ${companyName}</p>
                <p><strong>Candidate:</strong> ${candidateName}</p>
                <p><strong>Applied:</strong> Just now</p>
              </div>
              
              <p>This candidate has been pre-screened through our platform and meets the basic qualifications for remote work.</p>
              
              <a href="${applicationUrl}" class="button">Review Application →</a>
              
              <h3>📈 Next Steps:</h3>
              <ul>
                <li>Review the candidate's resume and cover letter</li>
                <li>Check their profile for relevant experience</li>
                <li>Consider their availability and timezone</li>
                <li>Reach out if they seem like a good fit</li>
              </ul>
              
              <p>Remember, the best candidates often get multiple offers, so don't wait too long to reach out if you're interested!</p>
              
              <p>Best regards,<br>
              The AmperTalent Team</p>
            </div>
            <div class="footer">
              <p>© 2025 AmperTalent. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        New Application!
        
        Hi ${firstName},
        
        You've received a new application for your job posting.
        
        Application Details:
        - Position: ${jobTitle}
        - Company: ${companyName}
        - Candidate: ${candidateName}
        - Applied: Just now
        
        Review application: ${applicationUrl}
        
        Next Steps:
        - Review the candidate's resume and cover letter
        - Check their profile for relevant experience
        - Consider their availability and timezone
        - Reach out if they seem like a good fit
        
        The best candidates get multiple offers - don't wait too long!
        
        Best regards,
        The AmperTalent Team
      `
    }
  }

  /**
   * Application status update for job seekers
   */
  static applicationStatusUpdate(data: {
    firstName: string
    jobTitle: string
    companyName: string
    status: 'reviewed' | 'interview' | 'rejected' | 'hired'
    message?: string
    jobUrl: string
    isReconsideration?: boolean
  }): EmailTemplate {
    const { firstName, jobTitle, companyName, status, message, jobUrl, isReconsideration } = data

    const statusConfig = {
      reviewed: {
        subject: isReconsideration ? '🎉 Great news! Your application is back in consideration!' : '👀 Your application has been reviewed',
        emoji: isReconsideration ? '🎉' : '👀',
        title: isReconsideration ? 'Application Reconsidered!' : 'Application Reviewed',
        color: isReconsideration ? '#10b981' : '#3b82f6'
      },
      interview: {
        subject: '🎉 Interview invitation for your application',
        emoji: '🎉',
        title: 'Interview Invitation',
        color: '#10b981'
      },
      rejected: {
        subject: '📝 Update on your application',
        emoji: '📝',
        title: 'Application Update',
        color: '#ef4444'
      },
      hired: {
        subject: '🎊 Congratulations! You got the job!',
        emoji: '🎊',
        title: 'You\'re Hired!',
        color: '#10b981'
      }
    }

    const config = statusConfig[status]

    return {
      subject: config.subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Application Update</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${config.color}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: ${config.color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .message { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid ${config.color}; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${config.emoji} ${config.title}</h1>
              <p>Update on your application to ${companyName}</p>
            </div>
            <div class="content">
              <h2>Hi ${firstName},</h2>
              
              <p>We have an update on your application for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.</p>
              
              ${message ? `
                <div class="message">
                  <h3>💬 Message from the employer:</h3>
                  <p>${message}</p>
                </div>
              ` : ''}
              
              <a href="${jobUrl}" class="button">View Application Details →</a>
              
              ${status === 'hired' ? `
                <h3>🎉 Congratulations!</h3>
                <p>You've been selected for this position! The employer should be in touch soon with next steps.</p>
              ` : status === 'interview' ? `
                <h3>📅 Next Steps:</h3>
                <p>The employer is interested in interviewing you! They should contact you soon to schedule a time.</p>
              ` : status === 'rejected' ? `
                <h3>💪 Keep Going!</h3>
                <p>While this opportunity didn't work out, there are many other great positions available. Keep applying and stay positive!</p>
              ` : isReconsideration ? `
                <h3>🌟 Amazing News!</h3>
                <p>We're excited to let you know that your application has been reconsidered and you're back in the running! This is a great opportunity and we're hopeful about your candidacy. The employer will be reviewing your application again with fresh eyes.</p>
                <p>💪 Keep up the great work - your persistence is paying off!</p>
              ` : `
                <h3>👍 Good News!</h3>
                <p>Your application has been reviewed and you're being considered for this position.</p>
              `}
              
              <p>Thank you for using AmperTalent to find your next opportunity!</p>
              
              <p>Best regards,<br>
              The AmperTalent Team</p>
            </div>
            <div class="footer">
              <p>© 2025 AmperTalent. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        ${config.title}
        
        Hi ${firstName},
        
        Update on your application for ${jobTitle} at ${companyName}.
        
        ${message ? `Message from employer: ${message}` : ''}
        
        View details: ${jobUrl}
        
        ${status === 'hired' ? 'Congratulations! You got the job!' :
          status === 'interview' ? 'You\'ve been invited for an interview!' :
            status === 'rejected' ? 'Keep applying - there are many other opportunities!' :
              isReconsideration ? 'Amazing news! Your application has been reconsidered and you\'re back in the running! 🌟' :
                'Your application is being considered.'}
        
        Best regards,
        The AmperTalent Team
      `
    }
  }

  /**
   * Payment confirmation email
   */
  static paymentConfirmation(data: {
    firstName: string
    lastName?: string
    email: string
    amount: number
    description: string
    transactionId: string
    invoiceUrl?: string
    lineItems?: Array<{ name: string; amount: number }>
    isTrial?: boolean
    isRecurring?: boolean
    billingFirstName?: string
    billingLastName?: string
    address?: string
    city?: string
    state?: string
    zipCode?: string
    paymentType?: 'card' | 'paypal'
    paymentMethod?: string
  }): EmailTemplate {
    const { firstName, lastName, email, amount, description, transactionId, invoiceUrl, lineItems, isTrial, isRecurring, billingFirstName, billingLastName, address, city, state, zipCode, paymentType, paymentMethod } = data

    return {
      subject: isTrial ? `🎉 Your Free Trial is Active!` : `💳 Payment Confirmation - $${amount.toFixed(2)}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Confirmation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .email-wrapper { background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .logo-section { text-align: center; padding: 20px 30px 0 30px; background: #ffffff; }
            .logo-section img { width: 280px; height: auto; }
            .header { background: #50b7b7; color: white; padding: 25px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
            .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; }
            .content { padding: 30px; }
            .greeting { font-size: 16px; margin-bottom: 20px; }
            .section-title { color: #50b7b7; font-size: 16px; font-weight: 600; margin: 25px 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #50b7b7; }
            .info-table { width: 100%; background: #f8f9fa; border-radius: 6px; overflow: hidden; border-collapse: collapse; margin-bottom: 20px; }
            .info-table td { padding: 10px 12px; border-bottom: 1px solid #e9ecef; font-size: 14px; }
            .info-table tr:last-child td { border-bottom: none; }
            .info-table td:first-child { font-weight: 600; color: #555; white-space: nowrap; width: 1%; background: #f0f0f0; }
            .info-table td:last-child { color: #333; }
            .line-items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
            .line-items-table th { background: #50b7b7; color: white; padding: 10px 15px; text-align: left; font-weight: 600; }
            .line-items-table td { padding: 10px 15px; border-bottom: 1px solid #e9ecef; }
            .line-items-table tr.total-row td { border-bottom: none; font-weight: 700; background: #f0f8f8; }
            .line-items-table td.amount { text-align: right; }
            .button { display: inline-block; background: #50b7b7; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; margin-top: 15px; font-weight: 600; }
            .button:hover { background: #45a3a3; }
            .cta-section { text-align: center; margin: 25px 0; }
            .renew-text { font-size: 13px; color: #666; margin-top: 15px; font-style: italic; }
            .signature { margin-top: 25px; font-size: 14px; }
            .footer { text-align: center; padding: 25px; color: #888; font-size: 12px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="email-wrapper">
              <div class="logo-section">
                <img src="https://app.ampertalent.com/logo/logo.png" alt="AmperTalent" style="width:280px;height:auto;" />
              </div>
              <div class="header">
                <h1>${isTrial ? '🎉 Free Trial Activated!' : '💳 Payment Confirmed'}</h1>
                <p>${isTrial ? 'Your payment method has been saved — no charge today!' : 'Thank you for your payment!'}</p>
              </div>
              <div class="content">
                <p class="greeting">Hi <strong>${firstName}</strong>,</p>
                
                <p>${isTrial ? 'Great news! Your free trial is now active. Your payment method has been securely saved — <strong>no charge will be made today</strong>. Your first charge will occur when your trial period ends.' : 'We\'ve successfully processed your payment. Here are the details:'}</p>
                
                <h3 class="section-title">${isTrial ? 'Trial Details' : 'Payment Details'}</h3>
                <table class="info-table">
                  <tbody>
                    ${isTrial ? `
                    <tr>
                      <td width="170" style="width:170px">First Charge Date</td>
                      <td><strong>${new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></td>
                    </tr>
                    <tr>
                      <td width="170" style="width:170px">End Date</td>
                      <td>When cancelled</td>
                    </tr>
                    <tr>
                      <td width="170" style="width:170px">Plan</td>
                      <td>${description}</td>
                    </tr>
                    <tr>
                      <td width="170" style="width:170px">Order No</td>
                      <td>${transactionId}</td>
                    </tr>
                    ${paymentMethod ? `
                    <tr>
                      <td width="170" style="width:170px">Payment Method</td>
                      <td>${paymentMethod}</td>
                    </tr>` : ''}
                    ` : `
                    <tr>
                      <td width="170" style="width:170px">Date</td>
                      <td>${new Date().toLocaleDateString()}</td>
                    </tr>
                    <tr>
                      <td width="170" style="width:170px">Amount</td>
                      <td><strong>$${amount.toFixed(2)}</strong></td>
                    </tr>
                    <tr>
                      <td width="170" style="width:170px">Plan</td>
                      <td>${description}</td>
                    </tr>
                    <tr>
                      <td width="170" style="width:170px">Order No</td>
                      <td>${transactionId}</td>
                    </tr>
                    ${!isRecurring ? `
                    <tr>
                      <td width="170" style="width:170px">End Date</td>
                      <td>When cancelled</td>
                    </tr>` : ''}
                    ${paymentMethod ? `
                    <tr>
                      <td width="170" style="width:170px">Payment Method</td>
                      <td>${paymentMethod}</td>
                    </tr>` : ''}
                    `}
                    <tr>
                      <td width="170" style="width:170px">Email</td>
                      <td>${email}</td>
                    </tr>
                  </tbody>
                </table>
                
                ${lineItems && lineItems.length > 1 ? `
                <h3 class="section-title">Order Breakdown</h3>
                <table class="line-items-table">
                  <thead>
                    <tr><th>Item</th><th style="text-align:right">Amount</th></tr>
                  </thead>
                  <tbody>
                    ${lineItems.map(item => `
                    <tr>
                      <td>${item.name}</td>
                      <td class="amount">$${item.amount.toFixed(2)}</td>
                    </tr>`).join('')}
                    <tr class="total-row">
                      <td>Total</td>
                      <td class="amount">$${amount.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
                ` : ''}

                <h3 class="section-title">Billing Information</h3>
                ${paymentType === 'paypal' ? `
                <table class="info-table">
                  <tbody>
                    <tr>
                      <td width="170" style="width:170px">Name</td>
                      <td>${billingFirstName || billingLastName ? `${billingFirstName || ''}${billingLastName ? ` ${billingLastName}` : ''}`.trim() : `${firstName}${lastName ? ` ${lastName}` : ''}`}</td>
                    </tr>
                    <tr>
                      <td width="170" style="width:170px">Method</td>
                      <td>PayPal</td>
                    </tr>
                  </tbody>
                </table>
                ` : `
                <table class="info-table">
                  <tbody>
                    <tr>
                      <td width="170" style="width:170px">Name</td>
                      <td>${firstName}${lastName ? ` ${lastName}` : ''}</td>
                    </tr>
                    <tr>
                      <td width="170" style="width:170px">Bill To</td>
                      <td>${billingFirstName || billingLastName ? `${billingFirstName || ''}${billingLastName ? ` ${billingLastName}` : ''}`.trim() : 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td width="170" style="width:170px">Address</td>
                      <td>${address || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td width="170" style="width:170px">City</td>
                      <td>${city || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td width="170" style="width:170px">State</td>
                      <td>${state || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td width="170" style="width:170px">Zip Code</td>
                      <td>${zipCode || 'Not provided'}</td>
                    </tr>
                  </tbody>
                </table>
                `}

                ${!isRecurring ? `<p class="renew-text">This subscription is set to renew automatically using your payment method on file. You can manage or cancel this subscription from your Account.</p>` : ''}
                
                ${invoiceUrl ? `
                <div class="cta-section">
                  <a href="${invoiceUrl}" class="button">Download Invoice →</a>
                </div>
                ` : ''}
                
                <p class="signature"><strong>Best regards,</strong><br>
                The AmperTalent Team</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} AmperTalent. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
${isTrial ? 'FREE TRIAL ACTIVATED' : 'PAYMENT CONFIRMED'}

Hi ${firstName}${lastName ? ` ${lastName}` : ''},

${isTrial ? 'Great news! Your free trial is now active. Your payment method has been securely saved — no charge will be made today. Your first charge will occur when your trial period ends.' : "We've successfully processed your payment."}

========================================
${isTrial ? 'TRIAL DETAILS' : 'PAYMENT DETAILS'}
========================================
${isTrial ? `First Charge Date: ${new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
End Date: When cancelled
Plan: ${description}
Order No: ${transactionId}${paymentMethod ? `\nPayment Method: ${paymentMethod}` : ''}` : `Date: ${new Date().toLocaleDateString()}
Amount: $${amount.toFixed(2)}
Plan: ${description}
${lineItems && lineItems.length > 1 ? `
ORDER BREAKDOWN
${lineItems.map(item => `  ${item.name}: $${item.amount.toFixed(2)}`).join('\n')}
  Total: $${amount.toFixed(2)}
` : ''}Order No: ${transactionId}${!isRecurring ? '\nEnd Date: When cancelled' : ''}${paymentMethod ? `\nPayment Method: ${paymentMethod}` : ''}`}
Email: ${email}

========================================
BILLING INFORMATION
========================================
Name: ${firstName}${lastName ? ` ${lastName}` : ''}
${paymentType === 'paypal' ? `Method: PayPal` : `Bill To: ${billingFirstName || billingLastName ? `${billingFirstName || ''}${billingLastName ? ` ${billingLastName}` : ''}`.trim() : 'Not provided'}
Address: ${address || 'Not provided'}
City: ${city || 'Not provided'}
State: ${state || 'Not provided'}
Zip Code: ${zipCode || 'Not provided'}`}

${!isRecurring ? 'This subscription is set to renew automatically using your payment method on file. You can manage or cancel this subscription from your Account.\n' : ''}
Best regards,
The AmperTalent Team

---
© ${new Date().getFullYear()} AmperTalent. All rights reserved.
      `
    }
  }

  /**
   * Subscription renewal reminder
   */
  static subscriptionReminder(data: {
    firstName: string
    plan: string
    renewalDate: string
    amount: number
    manageUrl: string
    daysUntilRenewal?: number
    paymentMethod?: string
  }): EmailTemplate {
    const { firstName, plan, renewalDate, amount, manageUrl, daysUntilRenewal = 1, paymentMethod } = data
    const daysLabel = daysUntilRenewal === 1 ? '1 day' : `${daysUntilRenewal} days`

    return {
      subject: `🔔 Your ${plan} Membership Renews in ${daysLabel}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Subscription Renewal Reminder</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .email-wrapper { background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header { background: #50b7b7; color: white; padding: 25px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
            .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; }
            .content { padding: 30px; }
            .greeting { font-size: 16px; margin-bottom: 20px; }
            .section-title { color: #50b7b7; font-size: 16px; font-weight: 600; margin: 25px 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #50b7b7; }
            .info-table { width: 100%; background: #f8f9fa; border-radius: 6px; overflow: hidden; border-collapse: collapse; margin-bottom: 20px; }
            .info-table td { padding: 10px 12px; border-bottom: 1px solid #e9ecef; font-size: 14px; }
            .info-table tr:last-child td { border-bottom: none; }
            .info-table td:first-child { font-weight: 600; color: #555; white-space: nowrap; width: 1%; background: #f0f0f0; }
            .info-table td:last-child { color: #333; }
            .reminder-banner { background: #fff8e6; padding: 15px 20px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 0 6px 6px 0; }
            .reminder-banner p { margin: 0; color: #333; font-size: 14px; }
            .help-text { font-size: 14px; color: #666; margin-top: 20px; }
            .signature { margin-top: 25px; font-size: 14px; }
            .footer { text-align: center; padding: 25px; color: #888; font-size: 12px; border-top: 1px solid #eee; }
            .logo-section { text-align: center; padding: 20px 30px 0 30px; background: #ffffff; }
            .logo-section img { width: 280px; height: auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="email-wrapper">
              <div class="logo-section">
                <img src="https://app.ampertalent.com/logo/logo.png" alt="AmperTalent" style="width:280px;height:auto;" />
              </div>
              <div class="header">
                <h1>🔔 Renewal Reminder</h1>
                <p>Your membership renews soon</p>
              </div>
              <div class="content">
                <p class="greeting">Hi <strong>${firstName}</strong>,</p>
                
                <p>This is a friendly reminder that your AmperTalent membership will renew automatically in <strong>${daysLabel}</strong>.</p>
                
                <h3 class="section-title">Renewal Details</h3>
                <table class="info-table">
                  <tbody>
                    <tr>
                      <td width="170" style="width:170px">Plan</td>
                      <td><strong>${plan} Membership</strong></td>
                    </tr>
                    <tr>
                      <td width="170" style="width:170px">Renewal Date</td>
                      <td>${renewalDate}</td>
                    </tr>
                    <tr>
                      <td width="170" style="width:170px">Amount</td>
                      <td><strong>$${amount.toFixed(2)}</strong></td>
                    </tr>
                    <tr>
                      <td width="170" style="width:170px">Payment Method</td>
                      <td>${paymentMethod ?? 'Not provided'}</td>
                    </tr>
                  </tbody>
                </table>
                
                <div class="reminder-banner">
                  <p>⏰ <strong>No action required</strong> - your membership will renew automatically. You'll continue to enjoy all the benefits of your ${plan} membership.</p>
                </div>
                
                <p class="signature">Thank you for being a valued member!<br><br>
                <strong>Best regards,</strong><br>
                The AmperTalent Team</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} AmperTalent. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
RENEWAL REMINDER

Hi ${firstName},

This is a friendly reminder that your AmperTalent membership will renew automatically in ${daysLabel}.

========================================
RENEWAL DETAILS
========================================
Plan: ${plan} Membership
Renewal Date: ${renewalDate}
Amount: $${amount.toFixed(2)}
Payment Method: ${paymentMethod ?? 'Not provided'}

⏰ No action required - your membership will renew automatically.

Thank you for being a valued member!

Best regards,
The AmperTalent Team

---
© ${new Date().getFullYear()} AmperTalent. All rights reserved.
      `
    }
  }

  /**
   * Team invitation email
   */
  static teamInvitation(data: {
    firstName: string
    email: string
    companyName: string
    inviterName: string
    role: string
    acceptUrl: string
  }): EmailTemplate {
    const { firstName, email, companyName, inviterName, role, acceptUrl } = data

    const roleDescriptions = {
      admin: 'Full access including team management and billing',
      member: 'Can manage jobs and applications',
      viewer: 'Can view jobs and applications'
    }

    return {
      subject: `🤝 You're invited to join ${companyName}'s team on AmperTalent`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Team Invitation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .invitation-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }
            .role-badge { display: inline-block; background: #e8f4fd; color: #667eea; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🤝 Team Invitation</h1>
              <p>You've been invited to collaborate on AmperTalent</p>
            </div>
            <div class="content">
              <h2>Hi ${firstName || 'there'}!</h2>
              
              <p><strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong>'s team on AmperTalent.</p>
              
              <div class="invitation-details">
                <h3>📋 Invitation Details:</h3>
                <p><strong>Company:</strong> ${companyName}</p>
                <p><strong>Invited by:</strong> ${inviterName}</p>
                <p><strong>Your role:</strong> <span class="role-badge">${role.charAt(0).toUpperCase() + role.slice(1)}</span></p>
                <p><strong>Permissions:</strong> ${roleDescriptions[role as keyof typeof roleDescriptions] || 'Team member access'}</p>
                <p><strong>Email:</strong> ${email}</p>
              </div>
              
              <p>As a team member, you'll be able to collaborate on job postings, review applications, and help find the best candidates for your organization.</p>
              
              <a href="${acceptUrl}" class="button">Accept Invitation →</a>
              
              <h3>🚀 What you can do as a team member:</h3>
              <ul>
                ${role === 'admin' ? `
                  <li><strong>Full team management</strong> - Invite and manage other team members</li>
                  <li><strong>Billing access</strong> - Manage packages and payment methods</li>
                ` : ''}
                ${role === 'member' || role === 'admin' ? `
                  <li><strong>Job management</strong> - Create, edit, and manage job postings</li>
                  <li><strong>Application review</strong> - Review and respond to candidate applications</li>
                  <li><strong>Candidate communication</strong> - Message and interview candidates</li>
                ` : ''}
                <li><strong>Dashboard access</strong> - View team performance and analytics</li>
                <li><strong>Collaboration tools</strong> - Work together with your team members</li>
              </ul>
              
              <p><strong>This invitation will expire in 7 days</strong>, so be sure to accept it soon!</p>
              
              <p>If you don't have a AmperTalent account yet, don't worry - accepting this invitation will guide you through creating one.</p>
              
              <p>Questions about this invitation? Feel free to reach out to ${inviterName} or our support team.</p>
              
              <p>Best regards,<br>
              The AmperTalent Team</p>
            </div>
            <div class="footer">
              <p>You're receiving this email because ${inviterName} invited you to join ${companyName}'s team</p>
              <p>© 2025 AmperTalent. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Team Invitation - ${companyName}
        
        Hi ${firstName || 'there'}!
        
        ${inviterName} has invited you to join ${companyName}'s team on AmperTalent.
        
        Invitation Details:
        - Company: ${companyName}
        - Invited by: ${inviterName}
        - Your role: ${role.charAt(0).toUpperCase() + role.slice(1)}
        - Permissions: ${roleDescriptions[role as keyof typeof roleDescriptions] || 'Team member access'}
        - Email: ${email}
        
        Accept invitation: ${acceptUrl}
        
        What you can do as a team member:
        ${role === 'admin' ? '- Full team management and billing access\n' : ''}
        ${role === 'member' || role === 'admin' ? '- Job management and application review\n- Candidate communication\n' : ''}
        - Dashboard access and collaboration tools
        
        This invitation expires in 7 days.
        
        If you don't have an account yet, accepting will guide you through creating one.
        
        Questions? Contact ${inviterName} or our support team.
        
        Best regards,
        The AmperTalent Team
      `
    }
  }

  /**
   * Interview scheduled notification
   */
  static interviewScheduled(data: {
    firstName: string
    jobTitle: string
    companyName: string
    interviewDate: string
    interviewType: string
    jobUrl: string
    email: string
    employerEmail: string
  }): EmailTemplate {
    const { firstName, jobTitle, companyName, interviewDate, interviewType, jobUrl, employerEmail } = data

    return {
      subject: `Interview Scheduled: ${jobTitle} at ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Interview Scheduled</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .highlight { background: #e8f4fd; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Interview Scheduled! 📅</h1>
              <p>Great news, ${firstName}!</p>
            </div>
            <div class="content">
              <p>You've been selected for an interview with <strong>${companyName}</strong> for the position of <strong>${jobTitle}</strong>.</p>
              
              <div class="highlight">
                <h3>Interview Details:</h3>
                <p><strong>Type:</strong> ${interviewType}</p>
                <p><strong>Scheduled for:</strong> ${interviewDate}</p>
              </div>
              
              <p>Please prepare for your interview and check your email for any additional instructions from the employer.</p>
              
              <a href="${jobUrl}" class="button">View Job Details</a>
              
              <p>If you have any questions, feel free to contact the employer directly at ${employerEmail}.</p>
              
              <div class="footer">
                <p>Best of luck with your interview!</p>
                <p>© 2025 AmperTalent. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Interview Scheduled - ${jobTitle} at ${companyName}
        
        Hi ${firstName}!
        
        Great news! You've been selected for an interview with ${companyName} for the position of ${jobTitle}.
        
        Interview Details:
        - Type: ${interviewType}
        - Scheduled for: ${interviewDate}
        
        View job details: ${jobUrl}
        
        Contact employer: ${employerEmail}
        
        Best of luck!
        The AmperTalent Team
      `
    }
  }

  /**
   * Interview completed notification
   */
  static interviewCompleted(data: {
    firstName: string
    jobTitle: string
    companyName: string
    feedback?: string
    nextSteps: string
    jobUrl: string
    email: string
    employerEmail: string
  }): EmailTemplate {
    const { firstName, jobTitle, companyName, feedback, nextSteps, jobUrl, employerEmail } = data

    return {
      subject: `Interview Completed: ${jobTitle} at ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Interview Completed</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .highlight { background: #e8f4fd; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Interview Completed! ✅</h1>
              <p>Thank you for interviewing with ${companyName}, ${firstName}!</p>
            </div>
            <div class="content">
              <p>Your interview for the <strong>${jobTitle}</strong> position has been completed.</p>
              
              ${feedback ? `<div class="highlight">
                <h3>Feedback:</h3>
                <p>${feedback}</p>
              </div>` : ''}
              
              <div class="highlight">
                <h3>Next Steps:</h3>
                <p>${nextSteps}</p>
              </div>
              
              <a href="${jobUrl}" class="button">View Job Details</a>
              
              <p>If you have any questions, contact the employer at ${employerEmail}.</p>
              
              <div class="footer">
                <p>Thank you for using AmperTalent!</p>
                <p>© 2025 AmperTalent. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Interview Completed - ${jobTitle} at ${companyName}
        
        Hi ${firstName}!
        
        Your interview for the ${jobTitle} position has been completed.
        
        ${feedback ? `Feedback: ${feedback}\n\n` : ''}Next Steps: ${nextSteps}
        
        View job details: ${jobUrl}
        Contact employer: ${employerEmail}
        
        Thank you!
        The AmperTalent Team
      `
    }
  }

  /**
   * Service purchase confirmation email
   */
  static servicePurchaseConfirmation(data: {
    firstName: string
    serviceName: string
    amount: number
    transactionId: string
    servicesUrl: string
    email: string
  }): EmailTemplate {
    const { firstName, serviceName, amount, transactionId, servicesUrl } = data

    return {
      subject: `Service Purchase Confirmed: ${serviceName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Service Purchase Confirmed</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .highlight { background: #e8f4fd; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
            .receipt { background: white; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Purchase Confirmed! ✅</h1>
              <p>Thank you for your purchase, ${firstName}!</p>
            </div>
            <div class="content">
              <p>Your purchase of <strong>${serviceName}</strong> has been successfully confirmed.</p>

              <div class="receipt">
                <h3>Receipt Details:</h3>
                <p><strong>Service:</strong> ${serviceName}</p>
                <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
                <p><strong>Transaction ID:</strong> ${transactionId}</p>
                <p><strong>Status:</strong> <span style="color: #f59e0b;">Pending</span></p>
              </div>

              <div class="highlight">
                <h3>📋 What's Next?</h3>
                <p>Our team will review your request and contact you within <strong>1-2 business days</strong> to get started. You'll receive updates via email as we progress.</p>
              </div>

              <p>You can track the status of your purchase at any time:</p>
              <a href="${servicesUrl}" class="button">View My Purchases →</a>

              <p>If you have any questions about your service purchase, please don't hesitate to contact our support team.</p>

              <p>Best regards,<br>
              The AmperTalent Team</p>
            </div>
            <div class="footer">
              <p>© 2025 AmperTalent. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Service Purchase Confirmed!

        Hi ${firstName}!

        Your purchase of ${serviceName} has been successfully confirmed.

        Receipt Details:
        - Service: ${serviceName}
        - Amount: $${amount.toFixed(2)}
        - Transaction ID: ${transactionId}
        - Status: Pending

        What's Next?
        Our team will review your request and contact you within 1-2 business days to get started.

        View your purchases: ${servicesUrl}

        Best regards,
        The AmperTalent Team
      `
    }
  }

  /**
   * Service completion notification
   */
  static serviceCompleted(data: {
    firstName: string
    serviceName: string
    completedDate: string
    notes?: string
    servicesUrl: string
    email: string
  }): EmailTemplate {
    const { firstName, serviceName, completedDate, notes, servicesUrl } = data

    return {
      subject: `Service Completed: ${serviceName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Service Completed</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .highlight { background: #d1fae5; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Service Completed! 🎉</h1>
              <p>Your ${serviceName} is ready!</p>
            </div>
            <div class="content">
              <p>Hi ${firstName}!</p>

              <p>Great news! Your <strong>${serviceName}</strong> has been completed by our team.</p>

              <div class="highlight">
                <p><strong>Completed on:</strong> ${completedDate}</p>
              </div>

              ${notes ? `<div class="highlight">
                <h3>📝 Notes from Our Team:</h3>
                <p>${notes}</p>
              </div>` : ''}

              <p>You can view the full details of your completed service:</p>
              <a href="${servicesUrl}" class="button">View Service Details →</a>

              <p>We hope you found this service valuable! If you have any questions or feedback, please don't hesitate to reach out to our support team.</p>

              <p>Thank you for choosing AmperTalent!</p>

              <p>Best regards,<br>
              The AmperTalent Team</p>
            </div>
            <div class="footer">
              <p>© 2025 AmperTalent. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Service Completed!

        Hi ${firstName}!

        Great news! Your ${serviceName} has been completed by our team.

        Completed on: ${completedDate}

        ${notes ? `Notes from Our Team:\n${notes}\n\n` : ''}View service details: ${servicesUrl}

        Thank you for choosing AmperTalent!

        Best regards,
        The AmperTalent Team
      `
    }
  }

  /**
   * Service status update notification
   */
  static serviceStatusUpdate(data: {
    firstName: string
    serviceName: string
    oldStatus: string
    newStatus: string
    notes?: string
    servicesUrl: string
    email: string
  }): EmailTemplate {
    const { firstName, serviceName, oldStatus, newStatus, notes, servicesUrl } = data

    const statusColors: Record<string, string> = {
      pending: '#f59e0b',
      in_progress: '#3b82f6',
      completed: '#10b981',
      cancelled: '#ef4444'
    }

    const statusLabels: Record<string, string> = {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled'
    }

    return {
      subject: `Service Update: ${serviceName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Service Status Update</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .highlight { background: #e8f4fd; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
            .status { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; color: white; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Service Update 🔔</h1>
              <p>Your ${serviceName} has been updated, ${firstName}!</p>
            </div>
            <div class="content">
              <p>The status of your <strong>${serviceName}</strong> has changed:</p>

              <div class="highlight">
                <p><strong>Status:</strong>
                  <span class="status" style="background-color: ${statusColors[oldStatus] || '#6b7280'};">${statusLabels[oldStatus] || oldStatus}</span>
                  →
                  <span class="status" style="background-color: ${statusColors[newStatus] || '#6b7280'};">${statusLabels[newStatus] || newStatus}</span>
                </p>
              </div>

              ${notes ? `<div class="highlight">
                <h3>📝 Update Notes:</h3>
                <p>${notes}</p>
              </div>` : ''}

              <p>You can view the full details and track progress:</p>
              <a href="${servicesUrl}" class="button">View Service Details →</a>

              <p>If you have any questions, please contact our support team.</p>

              <p>Best regards,<br>
              The AmperTalent Team</p>
            </div>
            <div class="footer">
              <p>© 2025 AmperTalent. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Service Update

        Hi ${firstName}!

        The status of your ${serviceName} has changed:
        Status: ${statusLabels[oldStatus] || oldStatus} → ${statusLabels[newStatus] || newStatus}

        ${notes ? `Update Notes:\n${notes}\n\n` : ''}View service details: ${servicesUrl}

        Best regards,
        The AmperTalent Team
      `
    }
  }

  /**
   * Admin notification for new service purchase
   */
  static adminServicePurchaseNotification(data: {
    serviceName: string
    userName: string
    userEmail: string
    amount: number
    adminUrl: string
  }): EmailTemplate {
    const { serviceName, userName, userEmail, amount, adminUrl } = data

    return {
      subject: `[Admin] New Service Purchase: ${serviceName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Service Purchase</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .info-box { background: white; padding: 15px; border: 1px solid #ddd; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 New Service Purchase</h1>
              <p>Action Required</p>
            </div>
            <div class="content">
              <p><strong>A new service has been purchased and requires review.</strong></p>

              <div class="info-box">
                <h3>Purchase Details:</h3>
                <p><strong>Service:</strong> ${serviceName}</p>
                <p><strong>Customer:</strong> ${userName}</p>
                <p><strong>Email:</strong> ${userEmail}</p>
                <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
              </div>

              <p>Please review this request and contact the customer within 1-2 business days.</p>

              <a href="${adminUrl}" class="button">Review Service Request →</a>

              <p><em>This is an automated notification from the AmperTalent admin system.</em></p>
            </div>
            <div class="footer">
              <p>© 2025 AmperTalent Admin System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        [Admin] New Service Purchase

        A new service has been purchased and requires review.

        Purchase Details:
        - Service: ${serviceName}
        - Customer: ${userName}
        - Email: ${userEmail}
        - Amount: $${amount.toFixed(2)}

        Please review this request and contact the customer within 1-2 business days.

        Review request: ${adminUrl}

        This is an automated notification from the AmperTalent admin system.
      `
    }
  }

  /**
   * Admin Payment/Order Notification Email
   * 
   * Sent to admin recipients when any payment is processed:
   * - Seeker initial subscriptions (trial or paid)
   * - Seeker subscription renewals
   * - Employer package purchases
   * - Employer recurring payments
   */
  static adminPaymentNotification(data: {
    orderNumber: string
    orderDate: string
    customerName: string
    customerType: 'Seeker' | 'Employer'
    customerId: string
    customerEmail: string
    customerPhone?: string
    productDescription: string
    quantity: number
    price: number
    // Optional line items for add-on breakdown (concierge employers)
    lineItems?: Array<{
      name: string
      quantity: number
      price: number
    }>
    subscriptionStartDate?: string
    subscriptionEndDate?: string
    nextPaymentDate?: string
    recurringTotal?: string
    billingAddress?: {
      name?: string
      address?: string
      city?: string
      state?: string
      zip?: string
      country?: string
    }
    // Card billing info from checkout form (separate from employer profile billingAddress)
    billingFirstName?: string
    billingLastName?: string
    billingCardAddress?: string
    billingCardCity?: string
    billingCardState?: string
    billingCardZipCode?: string
    paymentType?: 'card' | 'paypal'
    howDidYouHear?: string
    isRenewal?: boolean
    paymentMethod?: string
    transactionId?: string
  }): EmailTemplate {
    const {
      orderNumber,
      orderDate,
      customerName,
      customerType,
      customerId,
      customerEmail,
      customerPhone,
      productDescription,
      quantity,
      price,
      lineItems,
      subscriptionStartDate,
      subscriptionEndDate,
      nextPaymentDate,
      recurringTotal,
      billingAddress,
      billingFirstName,
      billingLastName,
      billingCardAddress,
      billingCardCity,
      billingCardState,
      billingCardZipCode,
      paymentType,
      howDidYouHear,
      isRenewal,
      paymentMethod,
      transactionId
    } = data

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.ampertalent.com'
    const adminDashboardUrl = `${appUrl}/admin/${customerType.toLowerCase()}s`

    // Format price
    const formattedPrice = price === 0 ? '$0.00' : `$${price.toFixed(2)}`

    // Build billing address string - only if actual address data exists
    const hasBillingAddress = billingAddress && (
      billingAddress.name ||
      billingAddress.address ||
      billingAddress.city ||
      billingAddress.state ||
      billingAddress.zip
    )

    const fullBillingAddress = hasBillingAddress ?
      [
        billingAddress.name,
        billingAddress.address,
        [billingAddress.city, billingAddress.state, billingAddress.zip].filter(Boolean).join(', '),
        billingAddress.country
      ].filter(Boolean).join('<br>')
      : null

    return {
      subject: `New Order: ${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Order: ${orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .email-wrapper { background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header { background: #50b7b7; color: white; padding: 25px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
            .content { padding: 30px; }
            .congratulations { font-size: 16px; margin-bottom: 25px; }
            .order-banner { background: #f8f9fa; padding: 15px 20px; border-left: 4px solid #50b7b7; margin-bottom: 25px; }
            .order-banner .order-number { color: #50b7b7; font-weight: bold; font-size: 16px; }
            .order-banner .order-date { color: #666; margin-left: 10px; }
            .section-title { color: #50b7b7; font-size: 16px; font-weight: 600; margin: 25px 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #50b7b7; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .order-table th { background: #50b7b7; color: white; text-align: left; padding: 12px 15px; font-size: 14px; font-weight: 600; }
            .order-table td { padding: 12px 15px; border-bottom: 1px solid #e9ecef; font-size: 14px; }
            .order-table tr:last-child td { border-bottom: none; }
            .info-table { width: 100%; background: #f8f9fa; border-radius: 6px; overflow: hidden; border-collapse: collapse; margin-bottom: 20px; }
            .info-table td { padding: 10px 12px; border-bottom: 1px solid #e9ecef; font-size: 14px; }
            .info-table tr:last-child td { border-bottom: none; }
            .info-table td:first-child { font-weight: 600; color: #555; white-space: nowrap; width: 1%; background: #f0f0f0; }
            .info-table td:last-child { color: #333; }
            .billing-section { background: #f8f9fa; padding: 20px; border-radius: 6px; margin-top: 20px; }
            .billing-section h4 { margin: 0 0 15px 0; color: #50b7b7; font-size: 14px; font-weight: 600; }
            .billing-section p { margin: 5px 0; font-size: 14px; color: #333; }
            .billing-section a { color: #50b7b7; text-decoration: none; }
            .congrats-footer { margin-top: 30px; padding: 20px; background: #e8f5f5; border-radius: 6px; text-align: center; }
            .congrats-footer p { margin: 0; color: #50b7b7; font-weight: 600; font-size: 16px; }
            .button { display: inline-block; background: #50b7b7; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: 600; }
            .button:hover { background: #45a3a3; }
            .footer { text-align: center; padding: 25px; color: #888; font-size: 12px; }
            .badge { display: inline-block; background: ${isRenewal ? '#28a745' : '#17a2b8'}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; margin-left: 10px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="email-wrapper">
              <div style="text-align: center; padding: 20px 30px 0 30px; background: #ffffff;">
                <img src="https://app.ampertalent.com/logo/logo.png" alt="AmperTalent" style="width:280px;height:auto;" />
              </div>
              <div class="header">
                <h1>New Order: ${orderNumber}</h1>
              </div>
              <div class="content">
                <p class="congratulations">
                  Congratulations, you've received the following order from <strong>${customerName}</strong>.${isRenewal ? '<span class="badge">RENEWAL</span>' : ''}
                </p>
                
                <div class="order-banner">
                  <span class="order-number">Order #${orderNumber}</span>
                  <span class="order-date">| ${orderDate}</span>
                </div>

                <!-- Order Details Table -->
                <h3 class="section-title">Order Details</h3>
                <table class="order-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Customer</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${lineItems && lineItems.length > 0 ? `
                      ${lineItems.map((item, index) => `
                        <tr>
                          <td>${item.name}</td>
                          <td>${item.quantity}</td>
                          <td>$${item.price.toFixed(2)}</td>
                          <td>${index === 0 ? customerName : ''}</td>
                        </tr>
                      `).join('')}
                      <tr style="background: #f0f0f0; font-weight: bold;">
                        <td colspan="2" style="text-align: right;">Total:</td>
                        <td>${formattedPrice}</td>
                        <td></td>
                      </tr>
                    ` : `
                      <tr>
                        <td>${productDescription}</td>
                        <td>${quantity}</td>
                        <td>${formattedPrice}</td>
                        <td>${customerName}</td>
                      </tr>
                    `}
                  </tbody>
                </table>

                <!-- Subscription Information Table -->
                <h3 class="section-title">Subscription Information</h3>
                <table class="info-table">
                  <tbody>
                    <tr>
                      <td width="170" style="width:170px">Customer Type</td>
                      <td>${customerType}</td>
                    </tr>
                    <tr>
                      <td width="170" style="width:170px">Customer ID</td>
                      <td>${customerId}</td>
                    </tr>
                    ${subscriptionStartDate ? `<tr>
                      <td width="170" style="width:170px">Start Date</td>
                      <td>${subscriptionStartDate}</td>
                    </tr>` : ''}
                    ${nextPaymentDate ? `<tr>
                      <td width="170" style="width:170px">Next Payment Date</td>
                      <td>${nextPaymentDate}</td>
                    </tr>` : ''}
                    ${recurringTotal ? `<tr>
                      <td width="170" style="width:170px">Recurring Total</td>
                      <td>${recurringTotal}</td>
                    </tr>` : ''}
                    ${transactionId ? `<tr>
                      <td width="170" style="width:170px">Transaction ID</td>
                      <td>${transactionId}</td>
                    </tr>` : ''}
                    ${paymentMethod ? `<tr>
                      <td width="170" style="width:170px">Payment Method</td>
                      <td>${paymentMethod}</td>
                    </tr>` : ''}
                  </tbody>
                </table>

                <!-- Billing & Contact Info -->
                <h3 class="section-title">${paymentType === 'paypal' ? 'Contact Info' : 'Billing & Contact Info'}</h3>
                ${paymentType === 'paypal' ? `` : `
                <table class="info-table">
                  <tbody>
                    <tr>
                      <td width="170" style="width:170px">Bill To</td>
                      <td>${billingFirstName || billingLastName ? `${billingFirstName || ''}${billingLastName ? ` ${billingLastName}` : ''}`.trim() : (fullBillingAddress ? (billingAddress?.name || 'Not provided') : 'Not provided')}</td>
                    </tr>
                    <tr>
                      <td width="170" style="width:170px">Address</td>
                      <td>${billingCardAddress || billingAddress?.address || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td width="170" style="width:170px">City</td>
                      <td>${billingCardCity || billingAddress?.city || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td width="170" style="width:170px">State</td>
                      <td>${billingCardState || billingAddress?.state || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td width="170" style="width:170px">Zip Code</td>
                      <td>${billingCardZipCode || billingAddress?.zip || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td width="170" style="width:170px">Email</td>
                      <td>${customerEmail ? `<a href="mailto:${customerEmail}">${customerEmail}</a>` : 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td width="170" style="width:170px">Phone</td>
                      <td>${customerPhone ? `<a href="tel:${customerPhone}">${customerPhone}</a>` : 'Not provided'}</td>
                    </tr>
                  </tbody>
                </table>
                `}
                ${paymentType === 'paypal' ? `
                <table class="info-table">
                  <tbody>
                    <tr>
                      <td width="170" style="width:170px">Email</td>
                      <td>${customerEmail ? `<a href="mailto:${customerEmail}">${customerEmail}</a>` : 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td width="170" style="width:170px">Phone</td>
                      <td>${customerPhone ? `<a href="tel:${customerPhone}">${customerPhone}</a>` : 'Not provided'}</td>
                    </tr>
                  </tbody>
                </table>
                ` : ``}

                ${howDidYouHear ? `
                <div style="margin-top: 20px;">
                  <p><strong>How did you hear about us?:</strong> ${howDidYouHear}</p>
                </div>
                ` : ''}

                <div class="congrats-footer">
                  <p>🎉 Congratulations on the sale!</p>
                </div>

                <div style="text-align: center;">
                  <a href="${adminDashboardUrl}" class="button">View in Admin Dashboard</a>
                </div>

              </div>
              <div class="footer">
                <p>This is an automated notification from AmperTalent Admin System</p>
                <p>© ${new Date().getFullYear()} AmperTalent. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
NEW ORDER: ${orderNumber}

Congratulations, you've received the following order from ${customerName}.${isRenewal ? ' (RENEWAL)' : ''}

Order #${orderNumber} | ${orderDate}

========================================
ORDER DETAILS
========================================
${lineItems && lineItems.length > 0 ?
          lineItems.map(item => `${item.name} x${item.quantity} - $${item.price.toFixed(2)}`).join('\n') + `\n----------------------------------------\nTotal: ${formattedPrice}`
          : `Product: ${productDescription}\nQuantity: ${quantity}\nPrice: ${formattedPrice}`}
Customer: ${customerName}

========================================
SUBSCRIPTION INFORMATION
========================================
Customer Type: ${customerType}
Customer ID: ${customerId}
${subscriptionStartDate ? `Start Date: ${subscriptionStartDate}` : ''}
${nextPaymentDate ? `Next Payment Date: ${nextPaymentDate}` : ''}
${recurringTotal ? `Recurring Total: ${recurringTotal}` : ''}
${transactionId ? `Transaction ID: ${transactionId}` : ''}
${paymentMethod ? `Payment Method: ${paymentMethod}` : ''}

========================================
${paymentType === 'paypal' ? 'CONTACT INFO' : 'BILLING & CONTACT INFO'}
========================================
${paymentType === 'paypal' ? `` : `Bill To: ${billingFirstName || billingLastName ? `${billingFirstName || ''}${billingLastName ? ` ${billingLastName}` : ''}`.trim() : (billingAddress?.name || 'Not provided')}
Address: ${billingCardAddress || billingAddress?.address || 'Not provided'}
City: ${billingCardCity || billingAddress?.city || 'Not provided'}
State: ${billingCardState || billingAddress?.state || 'Not provided'}
Zip Code: ${billingCardZipCode || billingAddress?.zip || 'Not provided'}
`}

Email: ${customerEmail || 'Not provided'}
Phone: ${customerPhone || 'Not provided'}

${howDidYouHear ? `How did you hear about us?: ${howDidYouHear}` : ''}

🎉 Congratulations on the sale!

View in Admin Dashboard: ${adminDashboardUrl}

---
This is an automated notification from AmperTalent Admin System
© ${new Date().getFullYear()} AmperTalent. All rights reserved.
      `
    }
  }

  /**
   * Interview stage update notification
   */
  static interviewStageUpdate(data: {
    firstName: string
    jobTitle: string
    companyName: string
    stage: string
    notes?: string
    nextAction?: string
    jobUrl: string
    email: string
    employerEmail: string
  }): EmailTemplate {
    const { firstName, jobTitle, companyName, stage, notes, nextAction, jobUrl, employerEmail } = data

    return {
      subject: `Interview Update: ${jobTitle} at ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Interview Update</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .highlight { background: #e8f4fd; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Interview Update 📝</h1>
              <p>Update on your application for ${jobTitle}, ${firstName}!</p>
            </div>
            <div class="content">
              <p>Your interview process for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong> has moved to a new stage.</p>
              
              <div class="highlight">
                <h3>Current Stage:</h3>
                <p><strong>${stage}</strong></p>
              </div>
              
              ${notes ? `<div class="highlight">
                <h3>Notes:</h3>
                <p>${notes}</p>
              </div>` : ''}
              
              ${nextAction ? `<div class="highlight">
                <h3>Next Action:</h3>
                <p>${nextAction}</p>
              </div>` : ''}
              
              <a href="${jobUrl}" class="button">View Job Details</a>
              
              <p>For questions, contact the employer at ${employerEmail}.</p>
              
              <div class="footer">
                <p>We're here to help with your job search!</p>
                <p>© 2025 AmperTalent. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Interview Update - ${jobTitle} at ${companyName}
        
        Hi ${firstName}!
        
        Your interview process for the ${jobTitle} position has moved to a new stage.
        
        Current Stage: ${stage}
        ${notes ? `Notes: ${notes}\n` : ''}${nextAction ? `Next Action: ${nextAction}\n` : ''}
        
        View job details: ${jobUrl}
        Contact employer: ${employerEmail}
        
        The AmperTalent Team
      `
    }
  }
}

// Export template functions for easy access
export const emailTemplates = {
  welcomeSeeker: EmailTemplates.welcomeSeeker,
  welcomeEmployer: EmailTemplates.welcomeEmployer,
  jobApproved: EmailTemplates.jobApproved,
  jobRejected: EmailTemplates.jobRejected,
  newApplication: EmailTemplates.newApplication,
  applicationStatusUpdate: EmailTemplates.applicationStatusUpdate,
  paymentConfirmation: EmailTemplates.paymentConfirmation,
  subscriptionReminder: EmailTemplates.subscriptionReminder,
  teamInvitation: EmailTemplates.teamInvitation,
  interviewScheduled: EmailTemplates.interviewScheduled,
  interviewCompleted: EmailTemplates.interviewCompleted,
  interviewStageUpdate: EmailTemplates.interviewStageUpdate,
  servicePurchaseConfirmation: EmailTemplates.servicePurchaseConfirmation,
  serviceCompleted: EmailTemplates.serviceCompleted,
  serviceStatusUpdate: EmailTemplates.serviceStatusUpdate,
  adminServicePurchaseNotification: EmailTemplates.adminServicePurchaseNotification,
  adminPaymentNotification: EmailTemplates.adminPaymentNotification
}