const RESEND_API_URL = "https://api.resend.com/emails";

export default async function handler(req, res) {

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
        } = req.body || {};

        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all fields."
            });
        }

        if (!process.env.RESEND_API_KEY) {
            console.error("RESEND_API_KEY is missing");

            return res.status(500).json({
                success: false,
                message: "Email service is not configured."
            });
        }

        if (!process.env.RECEIVER_EMAIL) {
            console.error("RECEIVER_EMAIL is missing");

            return res.status(500).json({
                success: false,
                message: "Receiver email is not configured."
            });
        }


        // Send email to YOU
        const adminResponse = await fetch(
            "https://api.resend.com/emails",
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
                        "UpVestor <noreply@upvestor.club>",

                    to:
                        [process.env.RECEIVER_EMAIL],

                    reply_to:
                        email,

                    subject:
                        `New Website Message: ${subject}`,

                    html: `
                        <h2>New Website Message</h2>

                        <p>
                            <strong>Name:</strong>
                            ${escapeHtml(name)}
                        </p>

                        <p>
                            <strong>Email:</strong>
                            ${escapeHtml(email)}
                        </p>

                        <p>
                            <strong>Subject:</strong>
                            ${escapeHtml(subject)}
                        </p>

                        <hr>

                        <h3>Message</h3>

                        <p>
                            ${escapeHtml(message).replace(/\n/g, "<br>")}
                        </p>
                    `
                })
            }
        );


        if (!adminResponse.ok) {

            const error =
                await adminResponse.text();

            console.error(
                "Resend admin email error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Could not send your message."
            });
        }


        // Send confirmation email to CUSTOMER
        const customerResponse = await fetch(
            "https://api.resend.com/emails",
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
                        "UpVestor <noreply@upvestor.club>",

                    to:
                        [email],

                    reply_to:
                        process.env.RECEIVER_EMAIL,

                    subject:
                        "We received your message",

                    html: `
                        <h2>Hello ${escapeHtml(name)},</h2>

                        <p>
                            Thank you for contacting UpVestor.
                        </p>

                        <p>
                            We have received your message and
                            will get back to you as soon as possible.
                        </p>

                        <hr>

                        <h3>Your message</h3>

                        <p>
                            ${escapeHtml(message).replace(/\n/g, "<br>")}
                        </p>

                        <hr>

                        <p>
                            Thank you,<br>
                            UpVestor Team
                        </p>
                    `
                })
            }
        );


        if (!customerResponse.ok) {

            const error =
                await customerResponse.text();

            console.error(
                "Resend customer email error:",
                error
            );

            // Your email was already delivered,
            // so the main operation succeeded.
        }


        return res.status(200).json({
            success: true,
            message: "Your message was sent successfully."
        });


    } catch (error) {

        console.error(
            "CONTACT API ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
}


/*
|--------------------------------------------------------------------------
| Prevent HTML injection
|--------------------------------------------------------------------------
*/

function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
