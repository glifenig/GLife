
const form = document.getElementById("contactForm");
const button = document.getElementById("submitButton");
const status = document.getElementById("formStatus");

form.addEventListener("submit", async function (event) {

    event.preventDefault();

    // Change button while sending
    button.disabled = true;
    button.textContent = "Sending...";
    status.textContent = "";

    // Get form values
    const formData = {
        name: document.getElementById("name").value.trim(),

        email: document.getElementById("email").value.trim(),

        subject: document.getElementById("subject").value.trim(),

        message: document.getElementById("message").value.trim()
    };


    try {

        // Send data to your Vercel API
        const response = await fetch("/api/contact", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(formData)
        });


        const result = await response.json();


        if (response.ok && result.success) {

            // Success
            status.textContent =
                "✓ Your message was sent successfully.";

            status.style.color = "green";

            // Clear form
            form.reset();

        } else {

            // Server returned an error
            status.textContent =
                result.message ||
                "Unable to send your message.";

            status.style.color = "red";
        }


    } catch (error) {

        console.error("Error:", error);

        status.textContent =
            "Something went wrong. Please try again.";

        status.style.color = "red";

    } finally {

        // Restore button
        button.disabled = false;
        button.textContent = "Send Message";
    }

});
