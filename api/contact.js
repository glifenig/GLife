const RESEND_API_URL = "https://api.resend.com/emails";

export default async function handler(req, res) {

    // Only allow POST
    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            message: "Method not allowed"
        });
    }

    try {

        const {
            name,
            email,
            subject,
            message
        } = req.body;

        // Validate
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all fields."
            });
        }

        // Basic email validation
        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        /*
        ========================================
        SEND EMAIL TO YOU
        ========================================
        */

        const adminEmail = await fetch(
            RESEND_API_URL,
            {
                method: "POST",

                headers: {
                    "Authorization":
                        `Bearer ${process.env.RESEND_API_KEY}`,

                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    from:
                        "Your Website <noreply@yourdomain.com>",

                    to:
                        [process.env.RECEIVER_EMAIL],

                    reply_to:
                        email,

                    subject:
                        `New Website Message: ${subject}`,

                    html: `
                        <h2>New Message From Your Website</h2>

                        <p>
                            <strong>Name:</strong>
                            ${name}
                        </p>

                        <p>
                            <strong>Email:</strong>
                            ${email}
                        </p>

                        <p>
                            <strong>Subject:</strong>
                            ${subject}
                        </p>

                        <hr>

                        <h3>Message</h3>

                        <p>
                            ${message.replace(/\n/g, "<br>")}
                        </p>
                    `
                })
            }
        );

        if (!adminEmail.ok) {

            const error =
                await adminEmail.text();

            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Could not send your message."
            });
        }


        /*
        ========================================
        SEND CONFIRMATION TO CUSTOMER
        ========================================
        */

        const customerEmail = await fetch(
            RESEND_API_URL,
            {
                method: "POST",

                headers: {
                    "Authorization":
                        `Bearer ${process.env.RESEND_API_KEY}`,

                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    from:
                        "Your Website <noreply@yourdomain.com>",

                    to:
                        [email],

                    reply_to:
                        process.env.RECEIVER_EMAIL,

                    subject:
                        "We received your message",

                    html: `
                        <h2>Hello ${name},</h2>

                        <p>
                            Thank you for contacting us.
                        </p>

                        <p>
                            We have received your message
                            and will get back to you as soon
                            as possible.
                        </p>

                        <hr>

                        <h3>Your Message</h3>

                        <p>
                            ${message.replace(/\n/g, "<br>")}
                        </p>

                        <hr>

                        <p>
                            Thank you,<br>
                            Your Website Team
                        </p>
                    `
                })
            }
        );

        if (!customerEmail.ok) {

            console.error(
                await customerEmail.text()
            );

            // Your message was already delivered,
            // so don't report total failure.
            return res.status(200).json({
                success: true,
                message:
                    "Your message was sent successfully."
            });
        }


        /*
        ========================================
        SUCCESS
        ========================================
        */

        return res.status(200).json({
            success: true,
            message:
                "Your message was sent successfully."
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Something went wrong. Please try again."
        });
    }
}
