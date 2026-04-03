tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: "#6A2FF9",
                "background-light": "#F7F7F8",
                "background-dark": "#120B29",
                "text-light": "#18181B",
                "text-dark": "#E4E4E7",
                "card-light": "#FFFFFF",
                "card-dark": "#1A1435",
                "border-light": "#E4E4E7",
                "border-dark": "#3F3F46"
            },
            fontFamily: {
                display: ["Inter", "sans-serif"],
            },
            borderRadius: {
                DEFAULT: "0.5rem",
            },
        },
    },
};

// Language translations
const translations = {
    en: {
        // Navigation
        features: "Features",
        products: "Products",
        pricing: "Pricing",
        aboutUs: "About",
        blog: "Blog",
        contact: "Contact",
        login: "Log in",
        getStarted: "Get Started",
        jessProduct: "Jess - AI Collections Agent",
        jessProductDesc: "Recover overdue payments on autopilot",
        michaelProduct: "Michael - AI Receptionist",
        michaelProductDesc: "Coming soon",

        // Hero section
        heroTitle: "Recover 60% More Payments \u2014 Without Lifting a Phone",
        heroSubtitle: "Seenn deploys AI agents that call overdue clients, send WhatsApp and SMS reminders, and follow up by email \u2014 all on autopilot, all under your brand.",
        startTrial: "Start Your Free Trial",
        seeDemo: "See a Demo",

        // Jess section
        sayHelloJess: "Meet Jess",
        jessSubtitle: "Your AI accounts receivable agent. She calls, texts, and emails overdue clients \u2014 so you never have to make an uncomfortable collection call again.",
        phoneReminders: "Voice Calls",
        phoneDesc: "Natural-sounding AI calls that follow your exact collection rules and tone.",
        whatsappSms: "WhatsApp & SMS",
        whatsappDesc: "Instant reminders with one-tap payment links. 98% open rate.",
        emailFollowups: "Email Sequences",
        emailDesc: "Branded, personalized follow-ups \u2014 logged and tracked in your dashboard.",

        // How it works
        howItWorksTitle: "How It Works",
        howItWorksSubtitle: "Four steps. Lightning-fast setup. Zero learning curve.",
        step0Title: "Connect in Minutes",
        step0Desc: "Get your own dedicated phone number with WhatsApp Business integration. No technical setup required.",
        step1Title: "Set Your Rules",
        step1Desc: "Define payment terms, grace periods, and escalation policies. Jess follows your playbook exactly.",
        step2Title: "Jess Takes Over",
        step2Desc: "When invoices go overdue, Jess automatically reaches out across every channel \u2014 phone, WhatsApp, SMS, and email.",
        step3Title: "Watch Payments Roll In",
        step3Desc: "60% more recoveries. 40% better cash flow. Zero uncomfortable conversations. That\u2019s the Seenn effect.",
        buildWorkforce: "Ready to Put Collections on Autopilot?",

        // Agents section
        agentsSubtitle: "AI-Powered Revenue Recovery",
        agentsTitle: "AI agents that collect payments and capture leads around the clock",
        agentsDesc: "Jess handles collections on autopilot. Add Michael for 24/7 lead capture and never miss another opportunity.",
        specializedExperts: "Two AI agents built for revenue growth",

        // Meet your team
        ourAgents: "Our Agents",
        meetTeamTitle: "Your AI Collections Team Member",
        meetTeamDesc: "Not a chatbot. A full-stack AI agent that plugs into your accounting system, learns your preferences, and professionally manages every overdue account \u2014 start to finish.",
        feature1: "Automated voice calls to overdue accounts",
        feature2: "Omnichannel outreach: phone, WhatsApp, SMS, email",
        feature3: "Fully customizable escalation rules",
        feature4: "Professional tone that preserves client relationships",

        // Michael section
        meetMichael: "Meet Michael",
        michaelSubtitle: "Your AI receptionist that works while you sleep. Every call answered. Every lead captured. 24/7.",
        neverMissLead: "Never Miss a Lead:",
        neverMissLeadDesc: "Captures every inquiry \u2014 even at 2 AM on a Sunday.",
        availability247: "24/7 Availability:",
        availability247Desc: "Professional, on-brand reception every single time.",
        smartCallRouting: "Smart Call Routing:",
        smartCallRoutingDesc: "Qualifies leads, answers FAQs, and books appointments automatically.",

        // Social proof
        trustedBy: "Trusted by businesses across the US and Israel",
        stat1Number: "60%",
        stat1Label: "More Payments Recovered",
        stat2Number: "40%",
        stat2Label: "Better Cash Flow",
        stat3Number: "4",
        stat3Label: "Channels (Phone, WhatsApp, SMS, Email)",
        stat4Number: "24/7",
        stat4Label: "Always On",
        metaPartner: "Approved Meta Tech Provider",
        dataPrivacy: "No Data Shared with Third Parties",

        // Pricing
        pricingTitle: "Choose the Plan That Fits Your Needs",
        pricingSubtitle: "Build powerful collection workflows with AI Agents. Start free, upgrade as you grow.",
        trialPlan: "Trial",
        trialDesc: "Start for free",
        trialPrice: "$0",
        trialPeriod: "/14 days",
        trialFeature1: "2 clients",
        trialFeature2: "6 outbound calls",
        trialFeature3: "Your own phone number",
        trialFeature4: "All features to try",
        starterPlan: "Starter",
        starterDesc: "For small businesses",
        starterPrice: "$199",
        starterPeriod: "/month",
        starterFeature1: "100 active contacts",
        starterFeature2: "600 voice minutes",
        starterFeature3: "500 WhatsApp messages",
        starterFeature4: "1 seat, 1 agent",
        starterFeature5: "1 phone number",
        growthPlan: "Growth",
        growthDesc: "For growing businesses",
        growthPrice: "$599",
        growthPeriod: "/month",
        growthFeature1: "400 active contacts",
        growthFeature2: "2,400 voice minutes",
        growthFeature3: "2,000 WhatsApp messages",
        growthFeature4: "3 seats, 1 agent",
        growthFeature5: "2 phone numbers",
        mostPopular: "Most Popular",
        enterprisePlan: "Enterprise",
        enterpriseDesc: "For large organizations",
        enterprisePrice: "$1,499",
        enterprisePeriod: "/month",
        enterpriseFeature1: "1,200 active contacts",
        enterpriseFeature2: "8,640 voice minutes",
        enterpriseFeature3: "9,600 WhatsApp messages",
        enterpriseFeature4: "10 seats, 1 agent",
        enterpriseFeature5: "5 phone numbers",
        choosePlan: "Select Plan",
        contactSales: "Contact Sales",
        whatsIncluded: "What's included",
        everythingInStarter: "Everything in Starter, plus:",
        everythingInGrowth: "Everything in Growth, plus:",

        // Demo modal
        bookDemo: "Book a Demo",
        demoDescription: "Fill out the form below and we\u2019ll reach out to schedule your personalized walkthrough.",
        fullName: "Full Name *",
        email: "Email *",
        company: "Company *",
        phoneNumber: "Phone Number",
        preferredDateTime: "Preferred Date & Time",
        dateTimePlaceholder: "e.g., Tuesday, 2pm EST",
        additionalNotes: "Additional Notes",
        requestDemo: "Request Demo",
        sending: "Sending...",

        // Contact page
        home: "Home",
        contactPageTitle: "Get in Touch",
        contactPageSubtitle: "Questions about Seenn? Our team typically responds within 2 hours during business days.",
        firstName: "First Name *",
        lastName: "Last Name *",
        subject: "Subject *",
        message: "Message *",
        sendMessage: "Send Message",
        orEmailUs: "Or email us directly at:",
        successMessage: "\u2705 Thank you! Your message has been sent successfully. We\u2019ll get back to you soon!",
        errorMessage: "\u274C Something went wrong. Please try again or email us directly at hello@seenn.ai",

        // Privacy Policy page
        privacyPolicyTitle: "Privacy Policy",
        lastUpdated: "Last Updated: November 2025",
        ppIntroTitle: "1. Introduction",
        ppIntroText: "Seenn Inc (\"we,\" \"our,\" or \"us\") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered payment collection services.",
        ppCollectTitle: "2. Information We Collect",
        ppCollectText: "We collect information that you provide directly to us, including:",
        ppCollectItem1: "Business contact information (name, email, phone number)",
        ppCollectItem2: "Customer data necessary for payment collection services",
        ppCollectItem3: "Payment and billing information",
        ppCollectItem4: "Communication records and interactions with our AI agents",
        ppCollectItem5: "Usage data and analytics from our platform",
        ppUseTitle: "3. How We Use Your Information",
        ppUseText: "We use the information we collect to:",
        ppUseItem1: "Provide and maintain our AI payment collection services",
        ppUseItem2: "Process transactions and send payment reminders",
        ppUseItem3: "Communicate with you about our services",
        ppUseItem4: "Improve and optimize our AI agents and platform",
        ppUseItem5: "Comply with legal obligations and protect our rights",
        ppShareTitle: "4. Data Sharing and Disclosure",
        ppShareText: "We do not sell your personal information. We may share your information with:",
        ppShareItem1: "Service providers who assist in our operations",
        ppShareItem2: "Professional advisors and auditors",
        ppShareItem3: "Law enforcement when required by law",
        ppShareItem4: "Business partners with your consent",
        ppSecurityTitle: "5. Data Security",
        ppSecurityText: "We implement appropriate technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.",
        ppRightsTitle: "6. Your Rights",
        ppRightsText: "You have the right to:",
        ppRightsItem1: "Access and receive a copy of your personal data",
        ppRightsItem2: "Request correction of inaccurate data",
        ppRightsItem3: "Request deletion of your data",
        ppRightsItem4: "Object to or restrict certain processing",
        ppRightsItem5: "Withdraw consent where applicable",
        ppRetentionTitle: "7. Data Retention",
        ppRetentionText: "We retain your information for as long as necessary to provide our services and comply with legal obligations. Customer data is typically retained for the duration of your service agreement plus applicable legal retention periods.",
        ppContactTitle: "8. Contact Us",
        ppContactText: "If you have questions about this Privacy Policy, please contact us at:",
        ppContactEmail: "Email:",
        ppContactCompany: "Company:",

        // Terms of Service page
        termsTitle: "Terms of Service",
        tosAgreementTitle: "1. Agreement to Terms",
        tosAgreementText: "By accessing or using Seenn's AI-powered payment collection services (\"Services\"), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access our Services.",
        tosDescTitle: "2. Description of Services",
        tosDescText: "Seenn provides AI-powered payment collection services, including but not limited to:",
        tosDescItem1: "Automated phone reminders for payment collection",
        tosDescItem2: "WhatsApp and SMS payment notifications",
        tosDescItem3: "Email follow-up communications",
        tosDescItem4: "Integration with accounting and payment systems",
        tosRespTitle: "3. User Responsibilities",
        tosRespText: "You agree to:",
        tosRespItem1: "Provide accurate and complete information",
        tosRespItem2: "Maintain the security of your account credentials",
        tosRespItem3: "Comply with all applicable laws and regulations",
        tosRespItem4: "Use the Services only for lawful purposes",
        tosRespItem5: "Ensure you have proper authorization to collect payments from your customers",
        tosPaymentTitle: "4. Payment and Billing",
        tosPaymentText: "You agree to pay all fees associated with your use of the Services. Fees are subject to change with notice. Failure to pay may result in suspension or termination of Services.",
        tosIpTitle: "5. Intellectual Property",
        tosIpText: "All rights, title, and interest in and to the Services, including our AI technology, are and will remain the exclusive property of Seenn Inc. You may not copy, modify, or reverse engineer any part of our Services.",
        tosDataTitle: "6. Data Usage and Privacy",
        tosDataText: "We process customer data according to your instructions and our Privacy Policy. You are responsible for ensuring you have the legal right to share customer data with us for payment collection purposes.",
        tosLiabilityTitle: "7. Limitation of Liability",
        tosLiabilityText: "To the maximum extent permitted by law, Seenn Inc shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Services.",
        tosTerminationTitle: "8. Termination",
        tosTerminationText: "We may terminate or suspend your access to our Services immediately, without prior notice, for any breach of these Terms. Upon termination, your right to use the Services will immediately cease.",
        tosChangesTitle: "9. Changes to Terms",
        tosChangesText: "We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on this page. Your continued use of the Services after such modifications constitutes acceptance of the updated Terms.",
        tosContactTitle: "10. Contact Information",
        tosContactText: "For questions about these Terms of Service, please contact us at:",

        // Footer
        footerTagline: "AI-powered payment collection. Get paid faster, preserve relationships.",
        product: "Products",
        collectionsAgent: "Jess - AI Collections Agent",
        afterHoursAgent: "Michael - AI Receptionist (Coming Soon)",
        company: "Company",
        legal: "Legal",
        privacy: "Privacy Policy",
        terms: "Terms of Service",
        copyright: "\u00A9 2026 Seenn Inc. All rights reserved."
    },
    he: {
        // Navigation
        features: "\u05EA\u05DB\u05D5\u05E0\u05D5\u05EA",
        products: "\u05DE\u05D5\u05E6\u05E8\u05D9\u05DD",
        pricing: "\u05EA\u05DE\u05D7\u05D5\u05E8",
        aboutUs: "\u05D0\u05D5\u05D3\u05D5\u05EA",
        blog: "\u05D1\u05DC\u05D5\u05D2",
        contact: "\u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8",
        login: "\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA",
        getStarted: "\u05D4\u05EA\u05D7\u05D9\u05DC\u05D5 \u05E2\u05DB\u05E9\u05D9\u05D5",
        jessProduct: "\u05D2'\u05E1 - \u05E1\u05D5\u05DB\u05E0\u05EA \u05D2\u05D1\u05D9\u05D9\u05D4 \u05D1\u05D1\u05D9\u05E0\u05D4 \u05DE\u05DC\u05D0\u05DB\u05D5\u05EA\u05D9\u05EA",
        jessProductDesc: "\u05D2\u05D1\u05D9\u05D9\u05EA \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05D1\u05D0\u05D5\u05D8\u05D5\u05DE\u05D8 \u05DE\u05DC\u05D0",
        michaelProduct: "\u05DE\u05D9\u05D9\u05E7\u05DC - \u05E4\u05E7\u05D9\u05D3 AI",
        michaelProductDesc: "\u05D1\u05E7\u05E8\u05D5\u05D1",

        // Hero section
        heroTitle: "\u05D2\u05D1\u05D5 60% \u05D9\u05D5\u05EA\u05E8 \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u2014 \u05D1\u05DC\u05D9 \u05DC\u05D4\u05E8\u05D9\u05DD \u05D8\u05DC\u05E4\u05D5\u05DF",
        heroSubtitle: "Seenn \u05DE\u05E4\u05E2\u05D9\u05DC \u05E1\u05D5\u05DB\u05E0\u05D9 AI \u05E9\u05DE\u05EA\u05E7\u05E9\u05E8\u05D9\u05DD \u05DC\u05DC\u05E7\u05D5\u05D7\u05D5\u05EA \u05E9\u05D7\u05D9\u05D9\u05D1\u05D9\u05DD, \u05E9\u05D5\u05DC\u05D7\u05D9\u05DD \u05EA\u05D6\u05DB\u05D5\u05E8\u05D5\u05EA \u05D1-WhatsApp \u05D5-SMS, \u05D5\u05E2\u05D5\u05E7\u05D1\u05D9\u05DD \u05D1\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u2014 \u05D4\u05DB\u05DC \u05D1\u05D0\u05D5\u05D8\u05D5\u05DE\u05D8, \u05D4\u05DB\u05DC \u05EA\u05D7\u05EA \u05D4\u05DE\u05D5\u05EA\u05D2 \u05E9\u05DC\u05DB\u05DD.",
        startTrial: "\u05D4\u05EA\u05D7\u05D9\u05DC\u05D5 \u05EA\u05E7\u05D5\u05E4\u05EA \u05E0\u05D9\u05E1\u05D9\u05D5\u05DF \u05D7\u05D9\u05E0\u05DD",
        seeDemo: "\u05E6\u05E4\u05D5 \u05D1\u05D4\u05D3\u05D2\u05DE\u05D4",

        // Jess section
        sayHelloJess: "\u05D4\u05DB\u05D9\u05E8\u05D5 \u05D0\u05EA \u05D2'\u05E1",
        jessSubtitle: "\u05E1\u05D5\u05DB\u05E0\u05EA \u05D4\u05D2\u05D1\u05D9\u05D9\u05D4 \u05E9\u05DC\u05DB\u05DD \u05D1\u05D1\u05D9\u05E0\u05D4 \u05DE\u05DC\u05D0\u05DB\u05D5\u05EA\u05D9\u05EA. \u05D4\u05D9\u05D0 \u05DE\u05EA\u05E7\u05E9\u05E8\u05EA, \u05E9\u05D5\u05DC\u05D7\u05EA \u05D4\u05D5\u05D3\u05E2\u05D5\u05EA \u05D5\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC\u05D9\u05DD \u05DC\u05DC\u05E7\u05D5\u05D7\u05D5\u05EA \u05E9\u05D7\u05D9\u05D9\u05D1\u05D9\u05DD \u2014 \u05DB\u05D3\u05D9 \u05E9\u05DC\u05E2\u05D5\u05DC\u05DD \u05DC\u05D0 \u05EA\u05E6\u05D8\u05E8\u05DB\u05D5 \u05DC\u05E2\u05E9\u05D5\u05EA \u05E9\u05D9\u05D7\u05EA \u05D2\u05D1\u05D9\u05D9\u05D4 \u05DC\u05D0 \u05E0\u05E2\u05D9\u05DE\u05D4 \u05E9\u05D5\u05D1.",
        phoneReminders: "\u05E9\u05D9\u05D7\u05D5\u05EA \u05E7\u05D5\u05DC\u05D9\u05D5\u05EA",
        phoneDesc: "\u05E9\u05D9\u05D7\u05D5\u05EA AI \u05E9\u05E0\u05E9\u05DE\u05E2\u05D5\u05EA \u05D8\u05D1\u05E2\u05D9\u05D5\u05EA \u05D5\u05E4\u05D5\u05E2\u05DC\u05D5\u05EA \u05DC\u05E4\u05D9 \u05DB\u05DC\u05DC\u05D9 \u05D4\u05D2\u05D1\u05D9\u05D9\u05D4 \u05D5\u05D4\u05D8\u05D5\u05DF \u05E9\u05DC\u05DB\u05DD.",
        whatsappSms: "WhatsApp & SMS",
        whatsappDesc: "\u05EA\u05D6\u05DB\u05D5\u05E8\u05D5\u05EA \u05DE\u05D9\u05D9\u05D3\u05D9\u05D5\u05EA \u05E2\u05DD \u05E7\u05D9\u05E9\u05D5\u05E8 \u05EA\u05E9\u05DC\u05D5\u05DD \u05D1\u05DC\u05D7\u05D9\u05E6\u05D4 \u05D0\u05D7\u05EA. 98% \u05E9\u05D9\u05E2\u05D5\u05E8 \u05E4\u05EA\u05D9\u05D7\u05D4.",
        emailFollowups: "\u05E8\u05E6\u05E4\u05D9 \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC",
        emailDesc: "\u05DE\u05E2\u05E7\u05D1\u05D9\u05DD \u05DE\u05DE\u05D5\u05EA\u05D2\u05D9\u05DD \u05D5\u05D0\u05D9\u05E9\u05D9\u05D9\u05DD \u2014 \u05E0\u05E8\u05E9\u05DE\u05D9\u05DD \u05D5\u05DE\u05EA\u05D5\u05E2\u05D3\u05D9\u05DD \u05D1\u05DC\u05D5\u05D7 \u05D4\u05D1\u05E7\u05E8\u05D4 \u05E9\u05DC\u05DB\u05DD.",

        // How it works
        howItWorksTitle: "\u05D0\u05D9\u05DA \u05D6\u05D4 \u05E2\u05D5\u05D1\u05D3",
        howItWorksSubtitle: "\u05D0\u05E8\u05D1\u05E2\u05D4 \u05E6\u05E2\u05D3\u05D9\u05DD. \u05D4\u05E7\u05DE\u05D4 \u05DE\u05D4\u05D9\u05E8\u05D4. \u05D0\u05E4\u05E1 \u05E2\u05E7\u05D5\u05DE\u05EA \u05DC\u05DE\u05D9\u05D3\u05D4.",
        step0Title: "\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5 \u05EA\u05D5\u05DA \u05D3\u05E7\u05D5\u05EA",
        step0Desc: "\u05E7\u05D1\u05DC\u05D5 \u05DE\u05E1\u05E4\u05E8 \u05D8\u05DC\u05E4\u05D5\u05DF \u05D9\u05D9\u05E2\u05D5\u05D3\u05D9 \u05E9\u05DC\u05DB\u05DD \u05E2\u05DD \u05D0\u05D9\u05E0\u05D8\u05D2\u05E8\u05E6\u05D9\u05D9\u05EA WhatsApp Business. \u05D1\u05DC\u05D9 \u05D4\u05D2\u05D3\u05E8\u05D4 \u05D8\u05DB\u05E0\u05D9\u05EA.",
        step1Title: "\u05D4\u05D2\u05D3\u05D9\u05E8\u05D5 \u05D0\u05EA \u05D4\u05DB\u05DC\u05DC\u05D9\u05DD",
        step1Desc: "\u05D4\u05D2\u05D3\u05D9\u05E8\u05D5 \u05EA\u05E0\u05D0\u05D9 \u05EA\u05E9\u05DC\u05D5\u05DD, \u05EA\u05E7\u05D5\u05E4\u05D5\u05EA \u05D7\u05E1\u05D3 \u05D5\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05D4\u05E1\u05DC\u05DE\u05D4. \u05D2'\u05E1 \u05E4\u05D5\u05E2\u05DC\u05EA \u05D1\u05D3\u05D9\u05D5\u05E7 \u05DC\u05E4\u05D9 \u05D4\u05E4\u05DC\u05D9\u05D9\u05D1\u05D5\u05E7 \u05E9\u05DC\u05DB\u05DD.",
        step2Title: "\u05D2'\u05E1 \u05E0\u05DB\u05E0\u05E1\u05EA \u05DC\u05E4\u05E2\u05D5\u05DC\u05D4",
        step2Desc: "\u05DB\u05E9\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA \u05E2\u05D5\u05D1\u05E8\u05EA \u05D0\u05EA \u05DE\u05D5\u05E2\u05D3 \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD, \u05D2'\u05E1 \u05D9\u05D5\u05E6\u05D0\u05EA \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA \u05DC\u05E7\u05E9\u05E8 \u05D1\u05DB\u05DC \u05D4\u05E2\u05E8\u05D5\u05E6\u05D9\u05DD \u2014 \u05D8\u05DC\u05E4\u05D5\u05DF, WhatsApp, SMS \u05D5\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC.",
        step3Title: "\u05E8\u05D0\u05D5 \u05D0\u05D9\u05DA \u05D4\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05E0\u05DB\u05E0\u05E1\u05D9\u05DD",
        step3Desc: "60% \u05D9\u05D5\u05EA\u05E8 \u05D2\u05D1\u05D9\u05D9\u05D4. 40% \u05E9\u05D9\u05E4\u05D5\u05E8 \u05D1\u05EA\u05D6\u05E8\u05D9\u05DD. \u05D0\u05E4\u05E1 \u05E9\u05D9\u05D7\u05D5\u05EA \u05DE\u05D1\u05D9\u05DB\u05D5\u05EA. \u05D6\u05D4 \u05D4\u05D0\u05E4\u05E7\u05D8 \u05E9\u05DC Seenn.",
        buildWorkforce: "\u05DE\u05D5\u05DB\u05E0\u05D9\u05DD \u05DC\u05E9\u05D9\u05DD \u05D0\u05EA \u05D4\u05D2\u05D1\u05D9\u05D9\u05D4 \u05E2\u05DC \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8?",

        // Michael section
        meetMichael: "\u05D4\u05DB\u05D9\u05E8\u05D5 \u05D0\u05EA \u05DE\u05D9\u05D9\u05E7\u05DC",
        michaelSubtitle: "\u05E4\u05E7\u05D9\u05D3 \u05D4-AI \u05E9\u05DC\u05DB\u05DD \u05E9\u05E2\u05D5\u05D1\u05D3 \u05D2\u05DD \u05DB\u05E9\u05D0\u05EA\u05DD \u05D9\u05E9\u05E0\u05D9\u05DD. \u05DB\u05DC \u05E9\u05D9\u05D7\u05D4 \u05E0\u05E2\u05E0\u05D9\u05EA. \u05DB\u05DC \u05DC\u05D9\u05D3 \u05E0\u05EA\u05E4\u05E1. 24/7.",
        neverMissLead: "\u05D0\u05E3 \u05E4\u05E2\u05DD \u05DC\u05D0 \u05DE\u05E4\u05E1\u05E4\u05E1\u05D9\u05DD \u05DC\u05D9\u05D3:",
        neverMissLeadDesc: "\u05EA\u05D5\u05E4\u05E1 \u05DB\u05DC \u05E4\u05E0\u05D9\u05D9\u05D4 \u2014 \u05D2\u05DD \u05D1\u05E9\u05EA\u05D9\u05D9\u05DD \u05D1\u05DC\u05D9\u05DC\u05D4 \u05D1\u05D9\u05D5\u05DD \u05E8\u05D0\u05E9\u05D5\u05DF.",
        availability247: "\u05D6\u05DE\u05D9\u05E0\u05D5\u05EA 24/7:",
        availability247Desc: "\u05E7\u05D1\u05DC\u05EA \u05E4\u05E0\u05D9\u05DD \u05DE\u05E7\u05E6\u05D5\u05E2\u05D9\u05EA \u05D5\u05DE\u05DE\u05D5\u05EA\u05D2\u05EA, \u05DB\u05DC \u05E4\u05E2\u05DD \u05DE\u05D7\u05D3\u05E9.",
        smartCallRouting: "\u05E0\u05D9\u05EA\u05D5\u05D1 \u05E9\u05D9\u05D7\u05D5\u05EA \u05D7\u05DB\u05DD:",
        smartCallRoutingDesc: "\u05DE\u05E1\u05E0\u05DF \u05DC\u05D9\u05D3\u05D9\u05DD, \u05E2\u05D5\u05E0\u05D4 \u05E2\u05DC \u05E9\u05D0\u05DC\u05D5\u05EA \u05D5\u05E7\u05D5\u05D1\u05E2 \u05E4\u05D2\u05D9\u05E9\u05D5\u05EA \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA.",

        // Agents section
        agentsSubtitle: "\u05D2\u05D1\u05D9\u05D9\u05EA \u05D4\u05DB\u05E0\u05E1\u05D5\u05EA \u05DE\u05D5\u05E0\u05E2\u05EA \u05D1-AI",
        agentsTitle: "\u05E1\u05D5\u05DB\u05E0\u05D9 AI \u05E9\u05D2\u05D5\u05D1\u05D9\u05DD \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05D5\u05EA\u05D5\u05E4\u05E1\u05D9\u05DD \u05DC\u05D9\u05D3\u05D9\u05DD \u05DE\u05E1\u05D1\u05D9\u05D1 \u05DC\u05E9\u05E2\u05D5\u05DF",
        agentsDesc: "\u05D2'\u05E1 \u05DE\u05D8\u05E4\u05DC\u05EA \u05D1\u05D2\u05D1\u05D9\u05D9\u05D4 \u05D1\u05D0\u05D5\u05D8\u05D5\u05DE\u05D8. \u05D4\u05D5\u05E1\u05D9\u05E4\u05D5 \u05D0\u05EA \u05DE\u05D9\u05D9\u05E7\u05DC \u05DC\u05EA\u05E4\u05D9\u05E1\u05EA \u05DC\u05D9\u05D3\u05D9\u05DD 24/7 \u05D5\u05DC\u05D0 \u05EA\u05E4\u05E1\u05E4\u05E1\u05D5 \u05D0\u05E3 \u05D4\u05D6\u05D3\u05DE\u05E0\u05D5\u05EA.",
        specializedExperts: "\u05E9\u05E0\u05D9 \u05E1\u05D5\u05DB\u05E0\u05D9 AI \u05E9\u05E0\u05D1\u05E0\u05D5 \u05DC\u05D4\u05D2\u05D3\u05DC\u05EA \u05D4\u05DB\u05E0\u05E1\u05D5\u05EA",

        // Meet your team
        ourAgents: "\u05D4\u05E1\u05D5\u05DB\u05E0\u05D9\u05DD \u05E9\u05DC\u05E0\u05D5",
        meetTeamTitle: "\u05D7\u05D1\u05E8\u05EA \u05E6\u05D5\u05D5\u05EA \u05D4\u05D2\u05D1\u05D9\u05D9\u05D4 \u05E9\u05DC\u05DB\u05DD",
        meetTeamDesc: "\u05DC\u05D0 \u05E6'\u05D0\u05D8\u05D1\u05D5\u05D8. \u05E1\u05D5\u05DB\u05E0\u05EA AI \u05DE\u05EA\u05E7\u05D3\u05DE\u05EA \u05E9\u05DE\u05EA\u05D7\u05D1\u05E8\u05EA \u05DC\u05DE\u05E2\u05E8\u05DB\u05EA \u05D4\u05E0\u05D4\u05D7\u05E9\u05D1 \u05E9\u05DC\u05DB\u05DD, \u05DC\u05D5\u05DE\u05D3\u05EA \u05D0\u05EA \u05D4\u05D4\u05E2\u05D3\u05E4\u05D5\u05EA \u05E9\u05DC\u05DB\u05DD, \u05D5\u05DE\u05E0\u05D4\u05DC\u05EA \u05DB\u05DC \u05D7\u05E9\u05D1\u05D5\u05DF \u05D1\u05E4\u05D9\u05D2\u05D5\u05E8 \u2014 \u05DE\u05D4\u05D4\u05EA\u05D7\u05DC\u05D4 \u05D5\u05E2\u05D3 \u05D4\u05E1\u05D5\u05E3.",
        feature1: "\u05E9\u05D9\u05D7\u05D5\u05EA \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05D5\u05EA \u05DC\u05D7\u05E9\u05D1\u05D5\u05E0\u05D5\u05EA \u05D1\u05E4\u05D9\u05D2\u05D5\u05E8",
        feature2: "\u05D9\u05E6\u05D9\u05E8\u05EA \u05E7\u05E9\u05E8 \u05D1\u05DB\u05DC \u05D4\u05E2\u05E8\u05D5\u05E6\u05D9\u05DD: \u05D8\u05DC\u05E4\u05D5\u05DF, WhatsApp, SMS, \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC",
        feature3: "\u05DB\u05DC\u05DC\u05D9 \u05D4\u05E1\u05DC\u05DE\u05D4 \u05DE\u05D5\u05EA\u05D0\u05DE\u05D9\u05DD \u05D0\u05D9\u05E9\u05D9\u05EA \u05DC\u05D7\u05DC\u05D5\u05D8\u05D9\u05DF",
        feature4: "\u05D8\u05D5\u05DF \u05DE\u05E7\u05E6\u05D5\u05E2\u05D9 \u05E9\u05E9\u05D5\u05DE\u05E8 \u05E2\u05DC \u05D9\u05D7\u05E1\u05D9 \u05D4\u05DC\u05E7\u05D5\u05D7\u05D5\u05EA",

        // Social proof
        trustedBy: "\u05E2\u05E1\u05E7\u05D9\u05DD \u05D1\u05D0\u05E8\u05D4\u05F4\u05D1 \u05D5\u05D1\u05D9\u05E9\u05E8\u05D0\u05DC \u05E1\u05D5\u05DE\u05DB\u05D9\u05DD \u05E2\u05DC\u05D9\u05E0\u05D5",
        stat1Number: "60%",
        stat1Label: "\u05D9\u05D5\u05EA\u05E8 \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05E9\u05E0\u05D2\u05D1\u05D5",
        stat2Number: "40%",
        stat2Label: "\u05E9\u05D9\u05E4\u05D5\u05E8 \u05D1\u05EA\u05D6\u05E8\u05D9\u05DD \u05D4\u05DE\u05D6\u05D5\u05DE\u05E0\u05D9\u05DD",
        stat3Number: "4",
        stat3Label: "\u05E2\u05E8\u05D5\u05E6\u05D9\u05DD (\u05D8\u05DC\u05E4\u05D5\u05DF, WhatsApp, SMS, \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC)",
        stat4Number: "24/7",
        stat4Label: "\u05EA\u05DE\u05D9\u05D3 \u05E4\u05E2\u05D9\u05DC",
        metaPartner: "\u05E1\u05E4\u05E7 \u05D8\u05DB\u05E0\u05D5\u05DC\u05D5\u05D2\u05D9\u05D4 \u05DE\u05D0\u05D5\u05E9\u05E8 \u05E9\u05DC Meta",
        dataPrivacy: "\u05D0\u05E0\u05D7\u05E0\u05D5 \u05DC\u05D0 \u05DE\u05E9\u05EA\u05E4\u05D9\u05DD \u05DE\u05D9\u05D3\u05E2 \u05E2\u05DD \u05E6\u05D3\u05D3\u05D9\u05DD \u05E9\u05DC\u05D9\u05E9\u05D9\u05D9\u05DD",

        // Pricing
        pricingTitle: "\u05D1\u05D7\u05E8\u05D5 \u05D0\u05EA \u05D4\u05EA\u05D5\u05DB\u05E0\u05D9\u05EA \u05E9\u05DE\u05EA\u05D0\u05D9\u05DE\u05D4 \u05DC\u05DB\u05DD",
        pricingSubtitle: "\u05D1\u05E0\u05D5 \u05EA\u05D4\u05DC\u05D9\u05DB\u05D9 \u05D2\u05D1\u05D9\u05D9\u05D4 \u05D7\u05D6\u05E7\u05D9\u05DD \u05E2\u05DD \u05E1\u05D5\u05DB\u05E0\u05D9 AI. \u05D4\u05EA\u05D7\u05D9\u05DC\u05D5 \u05D1\u05D7\u05D9\u05E0\u05DD, \u05E9\u05D3\u05E8\u05D2\u05D5 \u05DB\u05E9\u05D0\u05EA\u05DD \u05D2\u05D3\u05DC\u05D9\u05DD.",
        trialPlan: "\u05E0\u05D9\u05E1\u05D9\u05D5\u05DF",
        trialDesc: "\u05D4\u05EA\u05D7\u05D9\u05DC\u05D5 \u05D1\u05D7\u05D9\u05E0\u05DD",
        trialPrice: "\u20AA0",
        trialPeriod: "/14 \u05D9\u05DE\u05D9\u05DD",
        trialFeature1: "2 \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA",
        trialFeature2: "6 \u05E9\u05D9\u05D7\u05D5\u05EA \u05D9\u05D5\u05E6\u05D0\u05D5\u05EA",
        trialFeature3: "\u05DE\u05E1\u05E4\u05E8 \u05D8\u05DC\u05E4\u05D5\u05DF \u05E9\u05DC\u05DB\u05DD",
        trialFeature4: "\u05DB\u05DC \u05D4\u05EA\u05DB\u05D5\u05E0\u05D5\u05EA \u05DC\u05E0\u05D9\u05E1\u05D9\u05D5\u05DF",
        starterPlan: "\u05E1\u05D8\u05D0\u05E8\u05D8\u05E8",
        starterDesc: "\u05DC\u05E2\u05E1\u05E7\u05D9\u05DD \u05E7\u05D8\u05E0\u05D9\u05DD",
        starterPrice: "$199",
        starterPeriod: "/\u05D7\u05D5\u05D3\u05E9",
        starterFeature1: "100 \u05D0\u05E0\u05E9\u05D9 \u05E7\u05E9\u05E8 \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD",
        starterFeature2: "600 \u05D3\u05E7\u05D5\u05EA \u05E9\u05D9\u05D7\u05D4",
        starterFeature3: "500 \u05D4\u05D5\u05D3\u05E2\u05D5\u05EA WhatsApp",
        starterFeature4: "\u05DE\u05D5\u05E9\u05D1 1, \u05E1\u05D5\u05DB\u05DF 1",
        starterFeature5: "\u05DE\u05E1\u05E4\u05E8 \u05D8\u05DC\u05E4\u05D5\u05DF 1",
        growthPlan: "\u05D2\u05E8\u05D5\u05EA\u05F3",
        growthDesc: "\u05DC\u05E2\u05E1\u05E7\u05D9\u05DD \u05E6\u05D5\u05DE\u05D7\u05D9\u05DD",
        growthPrice: "$599",
        growthPeriod: "/\u05D7\u05D5\u05D3\u05E9",
        growthFeature1: "400 \u05D0\u05E0\u05E9\u05D9 \u05E7\u05E9\u05E8 \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD",
        growthFeature2: "2,400 \u05D3\u05E7\u05D5\u05EA \u05E9\u05D9\u05D7\u05D4",
        growthFeature3: "2,000 \u05D4\u05D5\u05D3\u05E2\u05D5\u05EA WhatsApp",
        growthFeature4: "3 \u05DE\u05D5\u05E9\u05D1\u05D9\u05DD, \u05E1\u05D5\u05DB\u05DF 1",
        growthFeature5: "2 \u05DE\u05E1\u05E4\u05E8\u05D9 \u05D8\u05DC\u05E4\u05D5\u05DF",
        mostPopular: "\u05D4\u05DB\u05D9 \u05E4\u05D5\u05E4\u05D5\u05DC\u05E8\u05D9",
        enterprisePlan: "\u05D0\u05E0\u05D8\u05E8\u05E4\u05E8\u05D9\u05D9\u05D6",
        enterpriseDesc: "\u05DC\u05D0\u05E8\u05D2\u05D5\u05E0\u05D9\u05DD \u05D2\u05D3\u05D5\u05DC\u05D9\u05DD",
        enterprisePrice: "$1,499",
        enterprisePeriod: "/\u05D7\u05D5\u05D3\u05E9",
        enterpriseFeature1: "1,200 \u05D0\u05E0\u05E9\u05D9 \u05E7\u05E9\u05E8 \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD",
        enterpriseFeature2: "8,640 \u05D3\u05E7\u05D5\u05EA \u05E9\u05D9\u05D7\u05D4",
        enterpriseFeature3: "9,600 \u05D4\u05D5\u05D3\u05E2\u05D5\u05EA WhatsApp",
        enterpriseFeature4: "10 \u05DE\u05D5\u05E9\u05D1\u05D9\u05DD, \u05E1\u05D5\u05DB\u05DF 1",
        enterpriseFeature5: "5 \u05DE\u05E1\u05E4\u05E8\u05D9 \u05D8\u05DC\u05E4\u05D5\u05DF",
        choosePlan: "\u05D1\u05D7\u05E8\u05D5 \u05EA\u05D5\u05DB\u05E0\u05D9\u05EA",
        contactSales: "\u05E6\u05E8\u05D5 \u05E7\u05E9\u05E8 \u05E2\u05DD \u05DE\u05DB\u05D9\u05E8\u05D5\u05EA",
        whatsIncluded: "\u05DE\u05D4 \u05DB\u05DC\u05D5\u05DC",
        everythingInStarter: "\u05D4\u05DB\u05DC \u05DE\u05EA\u05D5\u05DB\u05E0\u05D9\u05EA \u05E1\u05D8\u05D0\u05E8\u05D8\u05E8, \u05D1\u05E0\u05D5\u05E1\u05E3:",
        everythingInGrowth: "\u05D4\u05DB\u05DC \u05DE\u05EA\u05D5\u05DB\u05E0\u05D9\u05EA \u05D2\u05E8\u05D5\u05EA\u05F3, \u05D1\u05E0\u05D5\u05E1\u05E3:",

        // Demo modal
        bookDemo: "\u05E7\u05D1\u05E2\u05D5 \u05D4\u05D3\u05D2\u05DE\u05D4",
        demoDescription: "\u05DE\u05DC\u05D0\u05D5 \u05D0\u05EA \u05D4\u05D8\u05D5\u05E4\u05E1 \u05D5\u05E0\u05D9\u05E6\u05D5\u05E8 \u05D0\u05D9\u05EA\u05DB\u05DD \u05E7\u05E9\u05E8 \u05DC\u05EA\u05D9\u05D0\u05D5\u05DD \u05D4\u05D3\u05D2\u05DE\u05D4 \u05D0\u05D9\u05E9\u05D9\u05EA.",
        fullName: "\u05E9\u05DD \u05DE\u05DC\u05D0 *",
        email: "\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC *",
        company: "\u05D7\u05D1\u05E8\u05D4 *",
        phoneNumber: "\u05DE\u05E1\u05E4\u05E8 \u05D8\u05DC\u05E4\u05D5\u05DF",
        preferredDateTime: "\u05EA\u05D0\u05E8\u05D9\u05DA \u05D5\u05E9\u05E2\u05D4 \u05DE\u05D5\u05E2\u05D3\u05E4\u05D9\u05DD",
        dateTimePlaceholder: "\u05DC\u05DE\u05E9\u05DC: \u05D9\u05D5\u05DD \u05E9\u05DC\u05D9\u05E9\u05D9, 14:00",
        additionalNotes: "\u05D4\u05E2\u05E8\u05D5\u05EA \u05E0\u05D5\u05E1\u05E4\u05D5\u05EA",
        requestDemo: "\u05E7\u05D1\u05E2\u05D5 \u05D4\u05D3\u05D2\u05DE\u05D4",
        sending: "\u05E9\u05D5\u05DC\u05D7...",

        // Contact page
        home: "\u05D3\u05E3 \u05D4\u05D1\u05D9\u05EA",
        contactPageTitle: "\u05E6\u05E8\u05D5 \u05E7\u05E9\u05E8",
        contactPageSubtitle: "\u05E9\u05D0\u05DC\u05D5\u05EA \u05DC\u05D2\u05D1\u05D9 Seenn? \u05D4\u05E6\u05D5\u05D5\u05EA \u05E9\u05DC\u05E0\u05D5 \u05D1\u05D3\u05E8\u05DA \u05DB\u05DC\u05DC \u05DE\u05D2\u05D9\u05D1 \u05EA\u05D5\u05DA \u05E9\u05E2\u05EA\u05D9\u05D9\u05DD \u05D1\u05D9\u05DE\u05D9 \u05E2\u05E1\u05E7\u05D9\u05DD.",
        firstName: "\u05E9\u05DD \u05E4\u05E8\u05D8\u05D9 *",
        lastName: "\u05E9\u05DD \u05DE\u05E9\u05E4\u05D7\u05D4 *",
        subject: "\u05E0\u05D5\u05E9\u05D0 *",
        message: "\u05D4\u05D5\u05D3\u05E2\u05D4 *",
        sendMessage: "\u05E9\u05DC\u05D9\u05D7\u05EA \u05D4\u05D5\u05D3\u05E2\u05D4",
        orEmailUs: "\u05D0\u05D5 \u05E4\u05E0\u05D5 \u05D0\u05DC\u05D9\u05E0\u05D5 \u05D9\u05E9\u05D9\u05E8\u05D5\u05EA \u05D1\u05DE\u05D9\u05D9\u05DC:",
        successMessage: "\u2705 \u05EA\u05D5\u05D3\u05D4! \u05D4\u05D4\u05D5\u05D3\u05E2\u05D4 \u05E0\u05E9\u05DC\u05D7\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4. \u05E0\u05D7\u05D6\u05D5\u05E8 \u05D0\u05DC\u05D9\u05DB\u05DD \u05D1\u05E7\u05E8\u05D5\u05D1!",
        errorMessage: "\u274C \u05DE\u05E9\u05D4\u05D5 \u05D4\u05E9\u05EA\u05D1\u05E9. \u05D0\u05E0\u05D0 \u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1 \u05D0\u05D5 \u05E4\u05E0\u05D5 \u05D0\u05DC\u05D9\u05E0\u05D5 \u05D9\u05E9\u05D9\u05E8\u05D5\u05EA \u05D1\u05DE\u05D9\u05D9\u05DC hello@seenn.ai",

        // Privacy Policy page
        privacyPolicyTitle: "\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05E4\u05E8\u05D8\u05D9\u05D5\u05EA",
        lastUpdated: "\u05E2\u05D3\u05DB\u05D5\u05DF \u05D0\u05D7\u05E8\u05D5\u05DF: \u05E0\u05D5\u05D1\u05DE\u05D1\u05E8 2025",
        ppIntroTitle: "1. \u05DE\u05D1\u05D5\u05D0",
        ppIntroText: "\u05D7\u05D1\u05E8\u05EA Seenn Inc (\"\u05D0\u05E0\u05D7\u05E0\u05D5\", \"\u05E9\u05DC\u05E0\u05D5\" \u05D0\u05D5 \"\u05D0\u05D5\u05EA\u05E0\u05D5\") \u05DE\u05D7\u05D5\u05D9\u05D1\u05EA \u05DC\u05D4\u05D2\u05DF \u05E2\u05DC \u05D4\u05E4\u05E8\u05D8\u05D9\u05D5\u05EA \u05E9\u05DC\u05DB\u05DD. \u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05E4\u05E8\u05D8\u05D9\u05D5\u05EA \u05D6\u05D5 \u05DE\u05E1\u05D1\u05D9\u05E8\u05D4 \u05DB\u05D9\u05E6\u05D3 \u05D0\u05E0\u05D5 \u05D0\u05D5\u05E1\u05E4\u05D9\u05DD, \u05DE\u05E9\u05EA\u05DE\u05E9\u05D9\u05DD, \u05D7\u05D5\u05E9\u05E4\u05D9\u05DD \u05D5\u05DE\u05D2\u05E0\u05D9\u05DD \u05E2\u05DC \u05D4\u05DE\u05D9\u05D3\u05E2 \u05E9\u05DC\u05DB\u05DD \u05D1\u05E2\u05EA \u05E9\u05D9\u05DE\u05D5\u05E9 \u05D1\u05E9\u05D9\u05E8\u05D5\u05EA\u05D9 \u05D2\u05D1\u05D9\u05D9\u05EA \u05D4\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05D4\u05DE\u05D1\u05D5\u05E1\u05E1\u05D9\u05DD \u05E2\u05DC AI.",
        ppCollectTitle: "2. \u05DE\u05D9\u05D3\u05E2 \u05E9\u05D0\u05E0\u05D5 \u05D0\u05D5\u05E1\u05E4\u05D9\u05DD",
        ppCollectText: "\u05D0\u05E0\u05D5 \u05D0\u05D5\u05E1\u05E4\u05D9\u05DD \u05DE\u05D9\u05D3\u05E2 \u05E9\u05D0\u05EA\u05DD \u05DE\u05E1\u05E4\u05E7\u05D9\u05DD \u05DC\u05E0\u05D5 \u05D9\u05E9\u05D9\u05E8\u05D5\u05EA, \u05DB\u05D5\u05DC\u05DC:",
        ppCollectItem1: "\u05E4\u05E8\u05D8\u05D9 \u05E7\u05E9\u05E8 \u05E2\u05E1\u05E7\u05D9\u05D9\u05DD (\u05E9\u05DD, \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC, \u05DE\u05E1\u05E4\u05E8 \u05D8\u05DC\u05E4\u05D5\u05DF)",
        ppCollectItem2: "\u05E0\u05EA\u05D5\u05E0\u05D9 \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA \u05D4\u05E0\u05D3\u05E8\u05E9\u05D9\u05DD \u05DC\u05E9\u05D9\u05E8\u05D5\u05EA\u05D9 \u05D2\u05D1\u05D9\u05D9\u05EA \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD",
        ppCollectItem3: "\u05DE\u05D9\u05D3\u05E2 \u05EA\u05E9\u05DC\u05D5\u05DD \u05D5\u05D7\u05D9\u05D5\u05D1",
        ppCollectItem4: "\u05E8\u05D9\u05E9\u05D5\u05DE\u05D9 \u05EA\u05E7\u05E9\u05D5\u05E8\u05EA \u05D5\u05D0\u05D9\u05E0\u05D8\u05E8\u05D0\u05E7\u05E6\u05D9\u05D5\u05EA \u05E2\u05DD \u05E1\u05D5\u05DB\u05E0\u05D9 \u05D4-AI \u05E9\u05DC\u05E0\u05D5",
        ppCollectItem5: "\u05E0\u05EA\u05D5\u05E0\u05D9 \u05E9\u05D9\u05DE\u05D5\u05E9 \u05D5\u05E0\u05D9\u05EA\u05D5\u05D7\u05D9\u05DD \u05DE\u05D4\u05E4\u05DC\u05D8\u05E4\u05D5\u05E8\u05DE\u05D4 \u05E9\u05DC\u05E0\u05D5",
        ppUseTitle: "3. \u05DB\u05D9\u05E6\u05D3 \u05D0\u05E0\u05D5 \u05DE\u05E9\u05EA\u05DE\u05E9\u05D9\u05DD \u05D1\u05DE\u05D9\u05D3\u05E2 \u05E9\u05DC\u05DB\u05DD",
        ppUseText: "\u05D0\u05E0\u05D5 \u05DE\u05E9\u05EA\u05DE\u05E9\u05D9\u05DD \u05D1\u05DE\u05D9\u05D3\u05E2 \u05E9\u05D0\u05E0\u05D5 \u05D0\u05D5\u05E1\u05E4\u05D9\u05DD \u05DB\u05D3\u05D9:",
        ppUseItem1: "\u05DC\u05E1\u05E4\u05E7 \u05D5\u05DC\u05EA\u05D7\u05D6\u05E7 \u05D0\u05EA \u05E9\u05D9\u05E8\u05D5\u05EA\u05D9 \u05D2\u05D1\u05D9\u05D9\u05EA \u05D4\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05E9\u05DC\u05E0\u05D5",
        ppUseItem2: "\u05DC\u05E2\u05D1\u05D3 \u05E2\u05E1\u05E7\u05D0\u05D5\u05EA \u05D5\u05DC\u05E9\u05DC\u05D5\u05D7 \u05EA\u05D6\u05DB\u05D5\u05E8\u05D5\u05EA \u05EA\u05E9\u05DC\u05D5\u05DD",
        ppUseItem3: "\u05DC\u05EA\u05E7\u05E9\u05E8 \u05D0\u05D9\u05EA\u05DB\u05DD \u05DC\u05D2\u05D1\u05D9 \u05D4\u05E9\u05D9\u05E8\u05D5\u05EA\u05D9\u05DD \u05E9\u05DC\u05E0\u05D5",
        ppUseItem4: "\u05DC\u05E9\u05E4\u05E8 \u05D5\u05DC\u05DE\u05D8\u05D1 \u05D0\u05EA \u05E1\u05D5\u05DB\u05E0\u05D9 \u05D4-AI \u05D5\u05D4\u05E4\u05DC\u05D8\u05E4\u05D5\u05E8\u05DE\u05D4 \u05E9\u05DC\u05E0\u05D5",
        ppUseItem5: "\u05DC\u05E2\u05DE\u05D5\u05D3 \u05D1\u05D7\u05D5\u05D1\u05D5\u05EA \u05DE\u05E9\u05E4\u05D8\u05D9\u05D5\u05EA \u05D5\u05DC\u05D4\u05D2\u05DF \u05E2\u05DC \u05D6\u05DB\u05D5\u05D9\u05D5\u05EA\u05D9\u05E0\u05D5",
        ppShareTitle: "4. \u05E9\u05D9\u05EA\u05D5\u05E3 \u05D5\u05D7\u05E9\u05D9\u05E4\u05EA \u05DE\u05D9\u05D3\u05E2",
        ppShareText: "\u05D0\u05E0\u05D5 \u05DC\u05D0 \u05DE\u05D5\u05DB\u05E8\u05D9\u05DD \u05D0\u05EA \u05D4\u05DE\u05D9\u05D3\u05E2 \u05D4\u05D0\u05D9\u05E9\u05D9 \u05E9\u05DC\u05DB\u05DD. \u05D0\u05E0\u05D5 \u05E2\u05E9\u05D5\u05D9\u05D9\u05DD \u05DC\u05E9\u05EA\u05E3 \u05D0\u05EA \u05D4\u05DE\u05D9\u05D3\u05E2 \u05E9\u05DC\u05DB\u05DD \u05E2\u05DD:",
        ppShareItem1: "\u05E1\u05E4\u05E7\u05D9 \u05E9\u05D9\u05E8\u05D5\u05EA \u05D4\u05DE\u05E1\u05D9\u05D9\u05E2\u05D9\u05DD \u05D1\u05E4\u05E2\u05D9\u05DC\u05D5\u05EA\u05E0\u05D5",
        ppShareItem2: "\u05D9\u05D5\u05E2\u05E6\u05D9\u05DD \u05DE\u05E7\u05E6\u05D5\u05E2\u05D9\u05D9\u05DD \u05D5\u05E8\u05D5\u05D0\u05D9 \u05D7\u05E9\u05D1\u05D5\u05DF",
        ppShareItem3: "\u05E8\u05E9\u05D5\u05D9\u05D5\u05EA \u05D0\u05DB\u05D9\u05E4\u05EA \u05D4\u05D7\u05D5\u05E7 \u05DB\u05D0\u05E9\u05E8 \u05E0\u05D3\u05E8\u05E9 \u05E2\u05DC \u05E4\u05D9 \u05D7\u05D5\u05E7",
        ppShareItem4: "\u05E9\u05D5\u05EA\u05E4\u05D9\u05DD \u05E2\u05E1\u05E7\u05D9\u05D9\u05DD \u05D1\u05D4\u05E1\u05DB\u05DE\u05EA\u05DB\u05DD",
        ppSecurityTitle: "5. \u05D0\u05D1\u05D8\u05D7\u05EA \u05DE\u05D9\u05D3\u05E2",
        ppSecurityText: "\u05D0\u05E0\u05D5 \u05DE\u05D9\u05D9\u05E9\u05DE\u05D9\u05DD \u05D0\u05DE\u05E6\u05E2\u05D9\u05DD \u05D8\u05DB\u05E0\u05D9\u05D9\u05DD \u05D5\u05D0\u05E8\u05D2\u05D5\u05E0\u05D9\u05D9\u05DD \u05DE\u05EA\u05D0\u05D9\u05DE\u05D9\u05DD \u05DB\u05D3\u05D9 \u05DC\u05D4\u05D2\u05DF \u05E2\u05DC \u05D4\u05DE\u05D9\u05D3\u05E2 \u05E9\u05DC\u05DB\u05DD \u05DE\u05E4\u05E0\u05D9 \u05D2\u05D9\u05E9\u05D4, \u05E9\u05D9\u05E0\u05D5\u05D9, \u05D7\u05E9\u05D9\u05E4\u05D4 \u05D0\u05D5 \u05D4\u05E9\u05DE\u05D3\u05D4 \u05DC\u05D0 \u05DE\u05D5\u05E8\u05E9\u05D9\u05DD. \u05E2\u05DD \u05D6\u05D0\u05EA, \u05D0\u05E3 \u05E9\u05D9\u05D8\u05EA \u05D4\u05E2\u05D1\u05E8\u05D4 \u05D3\u05E8\u05DA \u05D4\u05D0\u05D9\u05E0\u05D8\u05E8\u05E0\u05D8 \u05D0\u05D9\u05E0\u05D4 \u05DE\u05D0\u05D5\u05D1\u05D8\u05D7\u05EA \u05D1-100%.",
        ppRightsTitle: "6. \u05D4\u05D6\u05DB\u05D5\u05D9\u05D5\u05EA \u05E9\u05DC\u05DB\u05DD",
        ppRightsText: "\u05D9\u05E9 \u05DC\u05DB\u05DD \u05D0\u05EA \u05D4\u05D6\u05DB\u05D5\u05EA:",
        ppRightsItem1: "\u05DC\u05D2\u05E9\u05EA \u05D5\u05DC\u05E7\u05D1\u05DC \u05E2\u05D5\u05EA\u05E7 \u05E9\u05DC \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D4\u05D0\u05D9\u05E9\u05D9\u05D9\u05DD \u05E9\u05DC\u05DB\u05DD",
        ppRightsItem2: "\u05DC\u05D1\u05E7\u05E9 \u05EA\u05D9\u05E7\u05D5\u05DF \u05E9\u05DC \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05DC\u05D0 \u05DE\u05D3\u05D5\u05D9\u05E7\u05D9\u05DD",
        ppRightsItem3: "\u05DC\u05D1\u05E7\u05E9 \u05DE\u05D7\u05D9\u05E7\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05E9\u05DC\u05DB\u05DD",
        ppRightsItem4: "\u05DC\u05D4\u05EA\u05E0\u05D2\u05D3 \u05D0\u05D5 \u05DC\u05D4\u05D2\u05D1\u05D9\u05DC \u05E2\u05D9\u05D1\u05D5\u05D3 \u05DE\u05E1\u05D5\u05D9\u05DD",
        ppRightsItem5: "\u05DC\u05DE\u05E9\u05D5\u05DA \u05D4\u05E1\u05DB\u05DE\u05D4 \u05D1\u05DE\u05E7\u05D5\u05DD \u05E9\u05E8\u05DC\u05D5\u05D5\u05E0\u05D8\u05D9",
        ppRetentionTitle: "7. \u05E9\u05DE\u05D9\u05E8\u05EA \u05DE\u05D9\u05D3\u05E2",
        ppRetentionText: "\u05D0\u05E0\u05D5 \u05E9\u05D5\u05DE\u05E8\u05D9\u05DD \u05D0\u05EA \u05D4\u05DE\u05D9\u05D3\u05E2 \u05E9\u05DC\u05DB\u05DD \u05DB\u05DC \u05E2\u05D5\u05D3 \u05D6\u05D4 \u05E0\u05D7\u05D5\u05E5 \u05DB\u05D3\u05D9 \u05DC\u05E1\u05E4\u05E7 \u05D0\u05EA \u05D4\u05E9\u05D9\u05E8\u05D5\u05EA\u05D9\u05DD \u05E9\u05DC\u05E0\u05D5 \u05D5\u05DC\u05E2\u05DE\u05D5\u05D3 \u05D1\u05D7\u05D5\u05D1\u05D5\u05EA \u05DE\u05E9\u05E4\u05D8\u05D9\u05D5\u05EA. \u05E0\u05EA\u05D5\u05E0\u05D9 \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA \u05E0\u05E9\u05DE\u05E8\u05D9\u05DD \u05D1\u05D3\u05E8\u05DA \u05DB\u05DC\u05DC \u05DC\u05DE\u05E9\u05DA \u05EA\u05E7\u05D5\u05E4\u05EA \u05D4\u05E1\u05DB\u05DD \u05D4\u05E9\u05D9\u05E8\u05D5\u05EA \u05D1\u05EA\u05D5\u05E1\u05E4\u05EA \u05EA\u05E7\u05D5\u05E4\u05D5\u05EA \u05E9\u05DE\u05D9\u05E8\u05D4 \u05DE\u05E9\u05E4\u05D8\u05D9\u05D5\u05EA.",
        ppContactTitle: "8. \u05E6\u05E8\u05D5 \u05E7\u05E9\u05E8",
        ppContactText: "\u05D0\u05DD \u05D9\u05E9 \u05DC\u05DB\u05DD \u05E9\u05D0\u05DC\u05D5\u05EA \u05DC\u05D2\u05D1\u05D9 \u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05E4\u05E8\u05D8\u05D9\u05D5\u05EA \u05D6\u05D5, \u05E6\u05E8\u05D5 \u05E7\u05E9\u05E8 \u05D1\u05DB\u05EA\u05D5\u05D1\u05EA:",
        ppContactEmail: "\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC:",
        ppContactCompany: "\u05D7\u05D1\u05E8\u05D4:",

        // Terms of Service page
        termsTitle: "\u05EA\u05E0\u05D0\u05D9 \u05E9\u05D9\u05DE\u05D5\u05E9",
        tosAgreementTitle: "1. \u05D4\u05E1\u05DB\u05DE\u05D4 \u05DC\u05EA\u05E0\u05D0\u05D9\u05DD",
        tosAgreementText: "\u05D1\u05D2\u05D9\u05E9\u05D4 \u05DC\u05E9\u05D9\u05E8\u05D5\u05EA\u05D9 \u05D2\u05D1\u05D9\u05D9\u05EA \u05D4\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05D4\u05DE\u05D1\u05D5\u05E1\u05E1\u05D9\u05DD \u05E2\u05DC AI \u05E9\u05DC Seenn (\"\u05D4\u05E9\u05D9\u05E8\u05D5\u05EA\u05D9\u05DD\") \u05D0\u05D5 \u05E9\u05D9\u05DE\u05D5\u05E9 \u05D1\u05D4\u05DD, \u05D0\u05EA\u05DD \u05DE\u05E1\u05DB\u05D9\u05DE\u05D9\u05DD \u05DC\u05D4\u05D9\u05D5\u05EA \u05DE\u05D7\u05D5\u05D9\u05D1\u05D9\u05DD \u05DC\u05EA\u05E0\u05D0\u05D9 \u05E9\u05D9\u05DE\u05D5\u05E9 \u05D0\u05DC\u05D4. \u05D0\u05DD \u05D0\u05D9\u05E0\u05DB\u05DD \u05DE\u05E1\u05DB\u05D9\u05DE\u05D9\u05DD \u05DC\u05D7\u05DC\u05E7 \u05DB\u05DC\u05E9\u05D4\u05D5 \u05DE\u05D4\u05EA\u05E0\u05D0\u05D9\u05DD \u05D4\u05DC\u05DC\u05D5, \u05D0\u05D9\u05E0\u05DB\u05DD \u05E8\u05E9\u05D0\u05D9\u05DD \u05DC\u05D2\u05E9\u05EA \u05DC\u05E9\u05D9\u05E8\u05D5\u05EA\u05D9\u05DD \u05E9\u05DC\u05E0\u05D5.",
        tosDescTitle: "2. \u05EA\u05D9\u05D0\u05D5\u05E8 \u05D4\u05E9\u05D9\u05E8\u05D5\u05EA\u05D9\u05DD",
        tosDescText: "Seenn \u05DE\u05E1\u05E4\u05E7\u05EA \u05E9\u05D9\u05E8\u05D5\u05EA\u05D9 \u05D2\u05D1\u05D9\u05D9\u05EA \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05DE\u05D1\u05D5\u05E1\u05E1\u05D9 AI, \u05DB\u05D5\u05DC\u05DC \u05D1\u05D9\u05DF \u05D4\u05D9\u05EA\u05E8:",
        tosDescItem1: "\u05EA\u05D6\u05DB\u05D5\u05E8\u05D5\u05EA \u05D8\u05DC\u05E4\u05D5\u05E0\u05D9\u05D5\u05EA \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05D5\u05EA \u05DC\u05D2\u05D1\u05D9\u05D9\u05EA \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD",
        tosDescItem2: "\u05D4\u05D5\u05D3\u05E2\u05D5\u05EA \u05EA\u05E9\u05DC\u05D5\u05DD \u05D1-WhatsApp \u05D5-SMS",
        tosDescItem3: "\u05EA\u05E7\u05E9\u05D5\u05E8\u05EA \u05DE\u05E2\u05E7\u05D1 \u05D1\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC",
        tosDescItem4: "\u05D0\u05D9\u05E0\u05D8\u05D2\u05E8\u05E6\u05D9\u05D4 \u05E2\u05DD \u05DE\u05E2\u05E8\u05DB\u05D5\u05EA \u05D7\u05E9\u05D1\u05D5\u05E0\u05D0\u05D5\u05EA \u05D5\u05EA\u05E9\u05DC\u05D5\u05DD",
        tosRespTitle: "3. \u05D0\u05D7\u05E8\u05D9\u05D5\u05EA \u05D4\u05DE\u05E9\u05EA\u05DE\u05E9",
        tosRespText: "\u05D0\u05EA\u05DD \u05DE\u05EA\u05D7\u05D9\u05D9\u05D1\u05D9\u05DD:",
        tosRespItem1: "\u05DC\u05E1\u05E4\u05E7 \u05DE\u05D9\u05D3\u05E2 \u05DE\u05D3\u05D5\u05D9\u05E7 \u05D5\u05DE\u05DC\u05D0",
        tosRespItem2: "\u05DC\u05E9\u05DE\u05D5\u05E8 \u05E2\u05DC \u05D0\u05D1\u05D8\u05D7\u05EA \u05D0\u05D9\u05E9\u05D5\u05E8\u05D9 \u05D4\u05D7\u05E9\u05D1\u05D5\u05DF \u05E9\u05DC\u05DB\u05DD",
        tosRespItem3: "\u05DC\u05E6\u05D9\u05D9\u05EA \u05DC\u05DB\u05DC \u05D4\u05D7\u05D5\u05E7\u05D9\u05DD \u05D5\u05D4\u05EA\u05E7\u05E0\u05D5\u05EA \u05D4\u05D7\u05DC\u05D9\u05DD",
        tosRespItem4: "\u05DC\u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1\u05E9\u05D9\u05E8\u05D5\u05EA\u05D9\u05DD \u05DC\u05DE\u05D8\u05E8\u05D5\u05EA \u05D7\u05D5\u05E7\u05D9\u05D5\u05EA \u05D1\u05DC\u05D1\u05D3",
        tosRespItem5: "\u05DC\u05D5\u05D5\u05D3\u05D0 \u05E9\u05D9\u05E9 \u05DC\u05DB\u05DD \u05D4\u05E8\u05E9\u05D0\u05D4 \u05DE\u05EA\u05D0\u05D9\u05DE\u05D4 \u05DC\u05D2\u05D1\u05D5\u05EA \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05DE\u05D4\u05DC\u05E7\u05D5\u05D7\u05D5\u05EA \u05E9\u05DC\u05DB\u05DD",
        tosPaymentTitle: "4. \u05EA\u05E9\u05DC\u05D5\u05DD \u05D5\u05D7\u05D9\u05D5\u05D1",
        tosPaymentText: "\u05D0\u05EA\u05DD \u05DE\u05E1\u05DB\u05D9\u05DE\u05D9\u05DD \u05DC\u05E9\u05DC\u05DD \u05D0\u05EA \u05DB\u05DC \u05D4\u05E2\u05DE\u05DC\u05D5\u05EA \u05D4\u05E7\u05E9\u05D5\u05E8\u05D5\u05EA \u05DC\u05E9\u05D9\u05DE\u05D5\u05E9 \u05E9\u05DC\u05DB\u05DD \u05D1\u05E9\u05D9\u05E8\u05D5\u05EA\u05D9\u05DD. \u05D4\u05E2\u05DE\u05DC\u05D5\u05EA \u05DB\u05E4\u05D5\u05E4\u05D5\u05EA \u05DC\u05E9\u05D9\u05E0\u05D5\u05D9 \u05D1\u05D4\u05D5\u05D3\u05E2\u05D4 \u05DE\u05D5\u05E7\u05D3\u05DE\u05EA. \u05D0\u05D9 \u05EA\u05E9\u05DC\u05D5\u05DD \u05E2\u05DC\u05D5\u05DC \u05DC\u05D4\u05D1\u05D9\u05D0 \u05DC\u05D4\u05E9\u05E2\u05D9\u05D4 \u05D0\u05D5 \u05D4\u05E4\u05E1\u05E7\u05EA \u05E9\u05D9\u05E8\u05D5\u05EA\u05D9\u05DD.",
        tosIpTitle: "5. \u05E7\u05E0\u05D9\u05D9\u05DF \u05E8\u05D5\u05D7\u05E0\u05D9",
        tosIpText: "\u05DB\u05DC \u05D4\u05D6\u05DB\u05D5\u05D9\u05D5\u05EA, \u05D4\u05D1\u05E2\u05DC\u05D5\u05EA \u05D5\u05D4\u05D0\u05D9\u05E0\u05D8\u05E8\u05E1 \u05D1\u05E9\u05D9\u05E8\u05D5\u05EA\u05D9\u05DD \u05D5\u05D1\u05D4\u05DD, \u05DB\u05D5\u05DC\u05DC \u05D8\u05DB\u05E0\u05D5\u05DC\u05D5\u05D2\u05D9\u05D9\u05EA \u05D4-AI \u05E9\u05DC\u05E0\u05D5, \u05D4\u05DD \u05D5\u05D9\u05D9\u05E9\u05D0\u05E8\u05D5 \u05D4\u05E7\u05E0\u05D9\u05D9\u05DF \u05D4\u05D1\u05DC\u05E2\u05D3\u05D9 \u05E9\u05DC Seenn Inc. \u05D0\u05D9\u05E0\u05DB\u05DD \u05E8\u05E9\u05D0\u05D9\u05DD \u05DC\u05D4\u05E2\u05EA\u05D9\u05E7, \u05DC\u05E9\u05E0\u05D5\u05EA \u05D0\u05D5 \u05DC\u05D1\u05E6\u05E2 \u05D4\u05E0\u05D3\u05E1\u05D4 \u05DC\u05D0\u05D7\u05D5\u05E8 \u05E9\u05DC \u05DB\u05DC \u05D7\u05DC\u05E7 \u05DE\u05D4\u05E9\u05D9\u05E8\u05D5\u05EA\u05D9\u05DD \u05E9\u05DC\u05E0\u05D5.",
        tosDataTitle: "6. \u05E9\u05D9\u05DE\u05D5\u05E9 \u05D1\u05DE\u05D9\u05D3\u05E2 \u05D5\u05E4\u05E8\u05D8\u05D9\u05D5\u05EA",
        tosDataText: "\u05D0\u05E0\u05D5 \u05DE\u05E2\u05D1\u05D3\u05D9\u05DD \u05E0\u05EA\u05D5\u05E0\u05D9 \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA \u05D1\u05D4\u05EA\u05D0\u05DD \u05DC\u05D4\u05E0\u05D7\u05D9\u05D5\u05EA \u05E9\u05DC\u05DB\u05DD \u05D5\u05DC\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05D4\u05E4\u05E8\u05D8\u05D9\u05D5\u05EA \u05E9\u05DC\u05E0\u05D5. \u05D0\u05EA\u05DD \u05D0\u05D7\u05E8\u05D0\u05D9\u05DD \u05DC\u05D5\u05D5\u05D3\u05D0 \u05E9\u05D9\u05E9 \u05DC\u05DB\u05DD \u05D0\u05EA \u05D4\u05D6\u05DB\u05D5\u05EA \u05D4\u05D7\u05D5\u05E7\u05D9\u05EA \u05DC\u05E9\u05EA\u05E3 \u05E0\u05EA\u05D5\u05E0\u05D9 \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA \u05D0\u05D9\u05EA\u05E0\u05D5 \u05DC\u05DE\u05D8\u05E8\u05D5\u05EA \u05D2\u05D1\u05D9\u05D9\u05EA \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD.",
        tosLiabilityTitle: "7. \u05D4\u05D2\u05D1\u05DC\u05EA \u05D0\u05D7\u05E8\u05D9\u05D5\u05EA",
        tosLiabilityText: "\u05D1\u05DE\u05D9\u05D3\u05D4 \u05D4\u05DE\u05E7\u05E1\u05D9\u05DE\u05DC\u05D9\u05EA \u05D4\u05DE\u05D5\u05EA\u05E8\u05EA \u05D1\u05D7\u05D5\u05E7, Seenn Inc \u05DC\u05D0 \u05EA\u05D4\u05D9\u05D4 \u05D0\u05D7\u05E8\u05D0\u05D9\u05EA \u05DC\u05DB\u05DC \u05E0\u05D6\u05E7 \u05E2\u05E7\u05D9\u05E3, \u05DE\u05E7\u05E8\u05D9, \u05DE\u05D9\u05D5\u05D7\u05D3, \u05EA\u05D5\u05E6\u05D0\u05EA\u05D9 \u05D0\u05D5 \u05E2\u05D5\u05E0\u05E9\u05D9 \u05D4\u05E0\u05D5\u05D1\u05E2 \u05DE\u05D4\u05E9\u05D9\u05DE\u05D5\u05E9 \u05E9\u05DC\u05DB\u05DD \u05D0\u05D5 \u05D7\u05D5\u05E1\u05E8 \u05D4\u05D9\u05DB\u05D5\u05DC\u05EA \u05DC\u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1\u05E9\u05D9\u05E8\u05D5\u05EA\u05D9\u05DD.",
        tosTerminationTitle: "8. \u05E1\u05D9\u05D5\u05DD",
        tosTerminationText: "\u05D0\u05E0\u05D5 \u05E2\u05E9\u05D5\u05D9\u05D9\u05DD \u05DC\u05D4\u05E4\u05E1\u05D9\u05E7 \u05D0\u05D5 \u05DC\u05D4\u05E9\u05E2\u05D5\u05EA \u05D0\u05EA \u05D4\u05D2\u05D9\u05E9\u05D4 \u05E9\u05DC\u05DB\u05DD \u05DC\u05E9\u05D9\u05E8\u05D5\u05EA\u05D9\u05DD \u05E9\u05DC\u05E0\u05D5 \u05D1\u05D0\u05D5\u05E4\u05DF \u05DE\u05D9\u05D9\u05D3\u05D9, \u05DC\u05DC\u05D0 \u05D4\u05D5\u05D3\u05E2\u05D4 \u05DE\u05D5\u05E7\u05D3\u05DE\u05EA, \u05D1\u05D2\u05D9\u05DF \u05DB\u05DC \u05D4\u05E4\u05E8\u05D4 \u05E9\u05DC \u05EA\u05E0\u05D0\u05D9\u05DD \u05D0\u05DC\u05D4. \u05E2\u05DD \u05D4\u05E1\u05D9\u05D5\u05DD, \u05D6\u05DB\u05D5\u05EA\u05DB\u05DD \u05DC\u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1\u05E9\u05D9\u05E8\u05D5\u05EA\u05D9\u05DD \u05EA\u05D9\u05E4\u05E1\u05E7 \u05D1\u05D0\u05D5\u05E4\u05DF \u05DE\u05D9\u05D9\u05D3\u05D9.",
        tosChangesTitle: "9. \u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD \u05D1\u05EA\u05E0\u05D0\u05D9\u05DD",
        tosChangesText: "\u05D0\u05E0\u05D5 \u05E9\u05D5\u05DE\u05E8\u05D9\u05DD \u05DC\u05E2\u05E6\u05DE\u05E0\u05D5 \u05D0\u05EA \u05D4\u05D6\u05DB\u05D5\u05EA \u05DC\u05E9\u05E0\u05D5\u05EA \u05EA\u05E0\u05D0\u05D9\u05DD \u05D0\u05DC\u05D4 \u05D1\u05DB\u05DC \u05E2\u05EA. \u05E0\u05D5\u05D3\u05D9\u05E2 \u05DC\u05DB\u05DD \u05E2\u05DC \u05DB\u05DC \u05E9\u05D9\u05E0\u05D5\u05D9 \u05E2\u05DC \u05D9\u05D3\u05D9 \u05E4\u05E8\u05E1\u05D5\u05DD \u05D4\u05EA\u05E0\u05D0\u05D9\u05DD \u05D4\u05D7\u05D3\u05E9\u05D9\u05DD \u05D1\u05D3\u05E3 \u05D6\u05D4. \u05D4\u05DE\u05E9\u05DA \u05D4\u05E9\u05D9\u05DE\u05D5\u05E9 \u05E9\u05DC\u05DB\u05DD \u05D1\u05E9\u05D9\u05E8\u05D5\u05EA\u05D9\u05DD \u05DC\u05D0\u05D7\u05E8 \u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD \u05DB\u05D0\u05DC\u05D4 \u05DE\u05D4\u05D5\u05D5\u05D4 \u05E7\u05D1\u05DC\u05EA \u05D4\u05EA\u05E0\u05D0\u05D9\u05DD \u05D4\u05DE\u05E2\u05D5\u05D3\u05DB\u05E0\u05D9\u05DD.",
        tosContactTitle: "10. \u05E4\u05E8\u05D8\u05D9 \u05E7\u05E9\u05E8",
        tosContactText: "\u05DC\u05E9\u05D0\u05DC\u05D5\u05EA \u05DC\u05D2\u05D1\u05D9 \u05EA\u05E0\u05D0\u05D9 \u05E9\u05D9\u05DE\u05D5\u05E9 \u05D0\u05DC\u05D4, \u05E6\u05E8\u05D5 \u05E7\u05E9\u05E8 \u05D1\u05DB\u05EA\u05D5\u05D1\u05EA:",

        // Footer
        footerTagline: "\u05D2\u05D1\u05D9\u05D9\u05D4 \u05D7\u05DB\u05DE\u05D4 \u05E2\u05DD AI. \u05E7\u05D1\u05DC\u05D5 \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05DE\u05D4\u05E8 \u05D9\u05D5\u05EA\u05E8, \u05E9\u05DE\u05E8\u05D5 \u05E2\u05DC \u05D9\u05D7\u05E1\u05D9\u05DD.",
        product: "\u05DE\u05D5\u05E6\u05E8\u05D9\u05DD",
        collectionsAgent: "\u05D2'\u05E1 - \u05E1\u05D5\u05DB\u05E0\u05EA \u05D2\u05D1\u05D9\u05D9\u05D4 AI",
        afterHoursAgent: "\u05DE\u05D9\u05D9\u05E7\u05DC - \u05E4\u05E7\u05D9\u05D3 AI (\u05D1\u05E7\u05E8\u05D5\u05D1)",
        company: "\u05D7\u05D1\u05E8\u05D4",
        legal: "\u05DE\u05E9\u05E4\u05D8\u05D9",
        privacy: "\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05E4\u05E8\u05D8\u05D9\u05D5\u05EA",
        terms: "\u05EA\u05E0\u05D0\u05D9 \u05E9\u05D9\u05DE\u05D5\u05E9",
        copyright: "\u00A9 2026 Seenn Inc. \u05DB\u05DC \u05D4\u05D6\u05DB\u05D5\u05D9\u05D5\u05EA \u05E9\u05DE\u05D5\u05E8\u05D5\u05EA."
    }
};

// Language switching functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check for saved language preference, default to 'en' if none exists
    let currentLang = localStorage.getItem('preferredLanguage') || 'en';
    window.currentLanguage = currentLang; // Initialize global language variable
    const langToggle = document.getElementById('langToggle');
    const langToggleMobile = document.getElementById('langToggleMobile');
    const html = document.documentElement;

    // Apply saved language preference on page load
    if (currentLang === 'he') {
        updateLanguage('he');
    }

    if (langToggle) {
        langToggle.addEventListener('click', function() {
            currentLang = currentLang === 'en' ? 'he' : 'en';
            localStorage.setItem('preferredLanguage', currentLang); // Save preference
            updateLanguage(currentLang);
        });
    }

    if (langToggleMobile) {
        langToggleMobile.addEventListener('click', function() {
            currentLang = currentLang === 'en' ? 'he' : 'en';
            localStorage.setItem('preferredLanguage', currentLang); // Save preference
            updateLanguage(currentLang);
        });
    }

    function updateLanguage(lang) {
        // Update direction and language attribute
        if (lang === 'he') {
            html.setAttribute('dir', 'rtl');
            html.setAttribute('lang', 'he');
            if (langToggle) langToggle.textContent = 'English';
            if (langToggleMobile) langToggleMobile.textContent = 'English';
        } else {
            html.setAttribute('dir', 'ltr');
            html.setAttribute('lang', 'en');
            if (langToggle) langToggle.textContent = 'עברית';
            if (langToggleMobile) langToggleMobile.textContent = 'עברית';
        }

        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (translations[lang][key]) {
                element.textContent = translations[lang][key];
            }
        });

        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (translations[lang][key]) {
                element.placeholder = translations[lang][key];
            }
        });

        // Store current language for form submission
        window.currentLanguage = lang;
    }

});

// Mobile Menu Toggle
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const menuIcon = document.getElementById('menuIcon');
    const closeIcon = document.getElementById('closeIcon');

    if (mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.remove('hidden');
        menuIcon.classList.add('hidden');
        closeIcon.classList.remove('hidden');
    } else {
        mobileMenu.classList.add('hidden');
        menuIcon.classList.remove('hidden');
        closeIcon.classList.add('hidden');
    }
}

// Demo Modal Functions
function openDemoModal() {
    document.getElementById('demoModal').style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeDemoModal() {
    document.getElementById('demoModal').style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore scrolling
}

// Handle Demo Form Submission
async function handleDemoSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = document.getElementById('demoSubmitBtn');
    const messageDiv = document.getElementById('demoFormMessage');
    const currentLang = window.currentLanguage || 'en';

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = translations[currentLang].sending;
    messageDiv.style.display = 'none';

    try {
        const formData = new FormData(form);
        const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            // Success message
            messageDiv.textContent = '🎉 Thank you! Your demo request has been received. We\'ll contact you shortly!';
            messageDiv.style.backgroundColor = '#d4edda';
            messageDiv.style.color = '#155724';
            messageDiv.style.border = '1px solid #c3e6cb';
            messageDiv.style.display = 'block';

            // Reset form
            form.reset();

            // Close modal after 3 seconds
            setTimeout(() => {
                closeDemoModal();
                messageDiv.style.display = 'none';
            }, 3000);
        } else {
            throw new Error('Form submission failed');
        }
    } catch (error) {
        // Error message
        messageDiv.textContent = '❌ Something went wrong. Please try again or email us at hello@seenn.ai';
        messageDiv.style.backgroundColor = '#f8d7da';
        messageDiv.style.color = '#721c24';
        messageDiv.style.border = '1px solid #f5c6cb';
        messageDiv.style.display = 'block';
    } finally {
        // Restore button state
        submitBtn.disabled = false;
        submitBtn.textContent = translations[currentLang].requestDemo;
    }
}