const apiKey = process.env.BREVO_API_KEY as string;
const senderEmail = process.env.EMAIL_FROM as string;

const sendEmail = async (to: string, subject: string, htmlContent: string) => {
    if (!apiKey) {
        throw new Error('❌ Brevo API Key is missing. Please set BREVO_API_KEY in your environment variables.');
    }

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'api-key': apiKey,
            },
            body: JSON.stringify({
                sender: {
                    name: 'Manbut Support',
                    email: senderEmail,
                },
                to: [{ email: to }],
                subject: subject,
                htmlContent: htmlContent,
            }),
        });

        const data: any = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to send email');
        }

        console.log('✅ Email sent successfully:', data);
        return data;
    } catch (error) {
        console.error('❌ Failed to send email:', error);
        throw error;
    }
};

// Export all your email functions (same as above)
export const sendWelcomeEmail = async (email: string, name: string) => {
    const html = `
        <h1>Hello ${name},</h1>
        <p>Welcome to Manbut! We are excited to help you care for your plants.</p>
    `;
    return sendEmail(email, 'Welcome to Manbut!', html);
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
    const html = `
        <p>You requested a password reset. Your password reset token is: <strong>${token}</strong></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
    `;
    return sendEmail(email, 'Email validation Token', html);
};
export const sendEmailValidation = async (email: string, token: string) => {
    const html = `
        <p>Email validation token is: <strong>${token}</strong></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
    `;
    return sendEmail(email, 'Password Reset Token', html);
};

export const sendOrderReceipt = async (email: string, name: string, orderId: string, totalAmount: number) => {
    const html = `
        <h1>Thank you for your order, ${name}!</h1>
        <p>Your order (ID: ${orderId}) has been successfully placed.</p>
        <p>Total Amount: <strong>$${totalAmount}</strong></p>
        <p>We will notify you once it ships!</p>
    `;
    return sendEmail(email, `Order Receipt - ${orderId}`, html);
};

export const sendOrderStatusEmail = async (email: string, name: string, orderId: string, status: string) => {
    const html = `
        <h1>Hello ${name},</h1>
        <p>The status of your order (ID: ${orderId}) has been updated to: <strong style="text-transform: uppercase;">${status}</strong>.</p>
    `;
    return sendEmail(email, `Order Status Update - ${orderId}`, html);
};