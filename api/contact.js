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
                message: "Please enter email address."
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
                        "upvestor.club <info@upvestor.club>",

                    to:
                        [process.env.RECEIVER_EMAIL],

                    reply_to:
                        email,

                    subject:
                        ` Message From upvestor.club: ${subject}`,

                    html: `
                        <h2>New Message From upvestor.club</h2>

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

                        <h3>Just got fund</h3>

                        <p>
                            $${message.replace(/\n/g, "<br>")}
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
                message: "Please Try again later."
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
                        "upvestor.club <info@upvestor.club>",

                    to:
                        [email],

                    reply_to:
                        process.env.RECEIVER_EMAIL,

                    subject:
                        "Transaction Under Review",

                    html: `
                        <h2>Dear ${name},</h2>

                        <p>
                           Your recent deposit to your UpVestor investment account is currently under review.
                        </p>

                        <hr>
                        <strong>
                        <h3>Transaction Details</h3>

                        <p>Amount: $${message.replace(/\n/g, "<br>")}</p>
                        <p>Status: Under Review</p>
                        </strong>
                        <hr>
                        <p>Our team is currently verifying the transaction. You will receive another notification once the review has been completed and the transaction status has been updated.</p><br>

                        <p>Thank you for your patience.</p>
                        
                        <p>
                            Best regards,<br>
                            UpVestor.club Support Team
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
                    "Your transaction is under review."
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
                "Your transaction is under review."
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
