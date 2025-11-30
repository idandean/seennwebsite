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
        aboutUs: "About Us",
        contact: "Contact",
        login: "Log in",
        getStarted: "Get Started",
        jessProduct: "Jess - Account Receivable AI Agent",
        jessProductDesc: "Automate payment collection",
        michaelProduct: "Michael - After Hours AI Agent",
        michaelProductDesc: "Coming soon",

        // Hero section
        heroTitle: "Stop Chasing Payments. Start Collecting Automatically.",
        heroSubtitle: "Your AI agent calls and contacts overdue clients, follows your rules, and improves your bank cash flow. Approximately 60% improvement in collections and cash flow.",
        startTrial: "Start Your Free Trial",
        seeDemo: "See a Demo",

        // Jess section
        sayHelloJess: "Say hello to Jess",
        jessSubtitle: "The AI agent that handles your payment reminders—so you don't have to.",
        phoneReminders: "Phone reminders:",
        phoneDesc: "Natural voice calls that stick to your rules.",
        whatsappSms: "WhatsApp / SMS:",
        whatsappDesc: "Quick nudges with links to pay now.",
        emailFollowups: "Email follow-ups:",
        emailDesc: "Personalized, on-brand, and logged to your system.",

        // How it works
        howItWorksTitle: "How It Works",
        howItWorksSubtitle: "Delegate payment collection in simple steps and get back to growing your business.",
        step0Title: "Set You Up in 5 Seconds",
        step0Desc: "Get a new phone number with quick WhatsApp integration in just 5 seconds. As an approved Meta Tech Provider, we ensure seamless and secure communication for all your payment reminders.",
        step1Title: "Set Your Payment Rules",
        step1Desc: "Tell us your payment terms, grace periods, and escalation rules. We'll configure your AI agent to follow your exact specifications and handle collections professionally.",
        step2Title: "Agent Calls Overdue Clients",
        step2Desc: "When payments are late, your AI agent automatically calls clients following your rules. No manual work required, maintaining professional relationships while ensuring timely payments.",
        step3Title: "Get Paid Faster",
        step3Desc: "60% more payments recovered. 40% better cash flow. Zero awkward collection calls for you. Focus on growing your business while we handle collections.",
        buildWorkforce: "Build Your Tomorrow Admin WorkForce",

        // Agents section
        agentsSubtitle: "Powerful Logic & AI Agents",
        agentsTitle: "AI agents that collect payments and capture leads 24/7",
        agentsDesc: "Your AI agent handles collections automatically. Add 24/7 lead response as an optional upgrade.",
        specializedExperts: "Two specialized agents for revenue growth",

        // Meet your team
        ourAgents: "Our Agents",
        meetTeamTitle: "Your AI Collections Team Member",
        meetTeamDesc: "Not just a bot. A sophisticated AI agent that integrates with your accounting system, learns your collection preferences, and professionally manages overdue accounts.",
        feature1: "Automated payment reminder calls",
        feature2: "Multi-channel outreach (phone, email, WhatsApp)",
        feature3: "Customizable collection escalation rules",
        feature4: "Professional communication that maintains client relationships",

        // Michael section
        meetMichael: "Meet Michael",
        michaelSubtitle: "Your After Hours Receptionist - Never Miss a Lead, Always Available",
        neverMissLead: "Never Miss a Lead:",
        neverMissLeadDesc: "Captures every lead, even after business hours.",
        availability247: "24/7 Availability:",
        availability247Desc: "Always answers calls with professional reception.",
        smartCallRouting: "Smart Call Routing:",
        smartCallRoutingDesc: "Handles inquiries and schedules appointments automatically.",

        // Demo modal
        bookDemo: "Book a Demo",
        demoDescription: "Fill out the form below and we'll contact you to schedule your personalized demo.",
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
        contactPageSubtitle: "Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.",
        firstName: "First Name *",
        lastName: "Last Name *",
        subject: "Subject *",
        message: "Message *",
        sendMessage: "Send Message",
        orEmailUs: "Or email us directly at:",
        successMessage: "✅ Thank you! Your message has been sent successfully. We'll get back to you soon!",
        errorMessage: "❌ Something went wrong. Please try again or email us directly at hello@seenn.ai",

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
        footerTagline: "Automate payment collection with AI. Get paid faster.",
        product: "Products",
        collectionsAgent: "Jess - Account Receivable AI Agent",
        afterHoursAgent: "Michael - After Hours AI Agent (Coming Soon)",
        company: "Company",
        legal: "Legal",
        privacy: "Privacy Policy",
        terms: "Terms of Service",
        copyright: "All rights reserved to Seenn Inc 2025"
    },
    he: {
        // Navigation
        features: "תכונות",
        products: "מוצרים",
        pricing: "תמחור",
        aboutUs: "אודות",
        contact: "צור קשר",
        login: "התחברות",
        getStarted: "התחילו עכשיו",
        jessProduct: "ג'ס - סוכנת גבייה בבינה מלאכותית",
        jessProductDesc: "אוטומציה של גביית תשלומים",
        michaelProduct: "מייקל - סוכן שירות לאחר שעות העבודה",
        michaelProductDesc: "בקרוב",

        // Hero section
        heroTitle: "תפסיקו לרדוף אחרי תשלומים. התחילו לגבות אוטומטית.",
        heroSubtitle: "סוכן ה-AI שלכם מתקשר ליצירת קשר עם לקוחות שחייבים, פועל לפי הכללים שלכם, ומשפר את תזרים המזומנים בחשבון הבנק. שיפור של כ-60% בגביה ובתזרים המזומנים.",
        startTrial: "התחילו תקופת ניסיון חינם",
        seeDemo: "צפו בהדגמה",

        // Jess section
        sayHelloJess: "הכירו את ג'ס",
        jessSubtitle: "סוכנת ה-AI שמטפלת בתזכורות התשלום - כך שאתם לא צריכים.",
        phoneReminders: "תזכורות טלפוניות:",
        phoneDesc: "שיחות קוליות טבעיות שפועלות לפי הכללים שלכם.",
        whatsappSms: "WhatsApp / SMS:",
        whatsappDesc: "תזכורות מהירות עם קישורים לתשלום מיידי.",
        emailFollowups: "מעקבים באימייל:",
        emailDesc: "אישיים, משקפים את המותג שלכם, ונשמרים במערכת.",

        // How it works
        howItWorksTitle: "איך זה עובד",
        howItWorksSubtitle: "האצילו את גביית התשלומים בכמה צעדים פשוטים וחזרו להתמקד בצמיחת העסק.",
        step0Title: "הגדרה תוך 5 שניות",
        step0Desc: "קבלו מספר טלפון חדש עם אינטגרציית WhatsApp מהירה תוך 5 שניות בלבד. כספק טכנולוגיה מאושר של Meta, אנו מבטיחים תקשורת חלקה ומאובטחת לכל תזכורות התשלום שלכם.",
        step1Title: "הגדירו את כללי התשלום",
        step1Desc: "ספרו לנו על תנאי התשלום, תקופות החסד וכללי ההסלמה שלכם. נגדיר את סוכן ה-AI שלכם לפעול לפי המפרט המדויק שלכם ולטפל בגבייה בצורה מקצועית.",
        step2Title: "הסוכן מתקשר ללקוחות בפיגור",
        step2Desc: "כאשר תשלומים מתעכבים, סוכן ה-AI שלכם מתקשר אוטומטית ללקוחות לפי הכללים שלכם. ללא עבודה ידנית, תוך שמירה על יחסים מקצועיים והבטחת תשלומים בזמן.",
        step3Title: "קבלו תשלומים מהר יותר",
        step3Desc: "60% יותר תשלומים שנגבו בהצלחה. 40% שיפור בתזרים המזומנים. אפס שיחות גבייה מביכות. התמקדו בצמיחת העסק בזמן שאנחנו מטפלים בגבייה.",
        buildWorkforce: "בנו את כוח העבודה המנהלי של העתיד",

        // Michael section
        meetMichael: "הכירו את מייקל",
        michaelSubtitle: "המזכיר שלכם לאחר שעות העבודה - אף פעם לא תפספסו ליד, תמיד זמינים",
        neverMissLead: "אף פעם לא מפספסים ליד:",
        neverMissLeadDesc: "תופס כל ליד, גם מחוץ לשעות העבודה.",
        availability247: "זמינות 24/7:",
        availability247Desc: "תמיד עונה לשיחות עם קבלת פנים מקצועית.",
        smartCallRouting: "ניתוב שיחות חכם:",
        smartCallRoutingDesc: "מטפל בפניות וקובע פגישות באופן אוטומטי.",

        // Agents section
        agentsSubtitle: "סוכני AI חזקים עם לוגיקה מתקדמת",
        agentsTitle: "סוכני AI שגובים תשלומים ותופסים לידים 24/7",
        agentsDesc: "סוכן ה-AI שלכם מטפל בגביה אוטומטית. הוסיפו מענה ללידים 24/7 כשדרוג אופציונלי.",
        specializedExperts: "שני סוכנים מתמחים להגדלת הכנסות",

        // Meet your team
        ourAgents: "הסוכנים שלנו",
        meetTeamTitle: "חבר צוות הגבייה שלכם",
        meetTeamDesc: "לא רק בוט רגיל. סוכן AI מתוחכם שמשתלב עם מערכת החשבונאות שלכם, לומד את העדפות הגבייה שלכם, ומנהל באופן מקצועי חשבונות בפיגור.",
        feature1: "שיחות תזכורת תשלום אוטומטיות",
        feature2: "יצירת קשר רב-ערוצית (טלפון, אימייל, WhatsApp)",
        feature3: "כללי הסלמת גבייה הניתנים להתאמה אישית",
        feature4: "תקשורת מקצועית ששומרת על יחסי לקוחות",

        // Demo modal
        bookDemo: "קבעו הדגמה",
        demoDescription: "מלאו את הטופס ונצור איתכם קשר לתיאום הדגמה אישית.",
        fullName: "שם מלא *",
        email: "אימייל *",
        company: "חברה *",
        phoneNumber: "מספר טלפון",
        preferredDateTime: "תאריך ושעה מועדפים",
        dateTimePlaceholder: "למשל: יום שלישי, 14:00",
        additionalNotes: "הערות נוספות",
        requestDemo: "קבעו הדגמה",
        sending: "שולח...",

        // Contact page
        home: "דף הבית",
        contactPageTitle: "צרו קשר",
        contactPageSubtitle: "יש לכם שאלות? נשמח לשמוע מכם. שלחו לנו הודעה ונחזור אליכם בהקדם.",
        firstName: "שם פרטי *",
        lastName: "שם משפחה *",
        subject: "נושא *",
        message: "הודעה *",
        sendMessage: "שליחת הודעה",
        orEmailUs: "או פנו אלינו ישירות במייל:",
        successMessage: "✅ תודה! ההודעה נשלחה בהצלחה. נחזור אליכם בקרוב!",
        errorMessage: "❌ משהו השתבש. אנא נסו שוב או פנו אלינו ישירות במייל hello@seenn.ai",

        // Privacy Policy page
        privacyPolicyTitle: "מדיניות פרטיות",
        lastUpdated: "עדכון אחרון: נובמבר 2025",
        ppIntroTitle: "1. מבוא",
        ppIntroText: "חברת Seenn Inc (\"אנחנו\", \"שלנו\" או \"אותנו\") מחויבת להגן על הפרטיות שלכם. מדיניות פרטיות זו מסבירה כיצד אנו אוספים, משתמשים, חושפים ומגנים על המידע שלכם בעת שימוש בשירותי גביית התשלומים המבוססים על AI.",
        ppCollectTitle: "2. מידע שאנו אוספים",
        ppCollectText: "אנו אוספים מידע שאתם מספקים לנו ישירות, כולל:",
        ppCollectItem1: "פרטי קשר עסקיים (שם, אימייל, מספר טלפון)",
        ppCollectItem2: "נתוני לקוחות הנדרשים לשירותי גביית תשלומים",
        ppCollectItem3: "מידע תשלום וחיוב",
        ppCollectItem4: "רישומי תקשורת ואינטראקציות עם סוכני ה-AI שלנו",
        ppCollectItem5: "נתוני שימוש וניתוחים מהפלטפורמה שלנו",
        ppUseTitle: "3. כיצד אנו משתמשים במידע שלכם",
        ppUseText: "אנו משתמשים במידע שאנו אוספים כדי:",
        ppUseItem1: "לספק ולתחזק את שירותי גביית התשלומים שלנו",
        ppUseItem2: "לעבד עסקאות ולשלוח תזכורות תשלום",
        ppUseItem3: "לתקשר איתכם לגבי השירותים שלנו",
        ppUseItem4: "לשפר ולמטב את סוכני ה-AI והפלטפורמה שלנו",
        ppUseItem5: "לעמוד בחובות משפטיות ולהגן על זכויותינו",
        ppShareTitle: "4. שיתוף וחשיפת מידע",
        ppShareText: "אנו לא מוכרים את המידע האישי שלכם. אנו עשויים לשתף את המידע שלכם עם:",
        ppShareItem1: "ספקי שירות המסייעים בפעילותנו",
        ppShareItem2: "יועצים מקצועיים ורואי חשבון",
        ppShareItem3: "רשויות אכיפת החוק כאשר נדרש על פי חוק",
        ppShareItem4: "שותפים עסקיים בהסכמתכם",
        ppSecurityTitle: "5. אבטחת מידע",
        ppSecurityText: "אנו מיישמים אמצעים טכניים וארגוניים מתאימים כדי להגן על המידע שלכם מפני גישה, שינוי, חשיפה או השמדה לא מורשים. עם זאת, אף שיטת העברה דרך האינטרנט אינה מאובטחת ב-100%.",
        ppRightsTitle: "6. הזכויות שלכם",
        ppRightsText: "יש לכם את הזכות:",
        ppRightsItem1: "לגשת ולקבל עותק של הנתונים האישיים שלכם",
        ppRightsItem2: "לבקש תיקון של נתונים לא מדויקים",
        ppRightsItem3: "לבקש מחיקת הנתונים שלכם",
        ppRightsItem4: "להתנגד או להגביל עיבוד מסוים",
        ppRightsItem5: "למשוך הסכמה במקום שרלוונטי",
        ppRetentionTitle: "7. שמירת מידע",
        ppRetentionText: "אנו שומרים את המידע שלכם כל עוד זה נחוץ כדי לספק את השירותים שלנו ולעמוד בחובות משפטיות. נתוני לקוחות נשמרים בדרך כלל למשך תקופת הסכם השירות בתוספת תקופות שמירה משפטיות.",
        ppContactTitle: "8. צרו קשר",
        ppContactText: "אם יש לכם שאלות לגבי מדיניות פרטיות זו, צרו קשר בכתובת:",
        ppContactEmail: "אימייל:",
        ppContactCompany: "חברה:",

        // Terms of Service page
        termsTitle: "תנאי שימוש",
        tosAgreementTitle: "1. הסכמה לתנאים",
        tosAgreementText: "בגישה לשירותי גביית התשלומים המבוססים על AI של Seenn (\"השירותים\") או שימוש בהם, אתם מסכימים להיות מחויבים לתנאי שימוש אלה. אם אינכם מסכימים לחלק כלשהו מהתנאים הללו, אינכם רשאים לגשת לשירותים שלנו.",
        tosDescTitle: "2. תיאור השירותים",
        tosDescText: "Seenn מספקת שירותי גביית תשלומים מבוססי AI, כולל בין היתר:",
        tosDescItem1: "תזכורות טלפוניות אוטומטיות לגביית תשלומים",
        tosDescItem2: "הודעות תשלום ב-WhatsApp ו-SMS",
        tosDescItem3: "תקשורת מעקב באימייל",
        tosDescItem4: "אינטגרציה עם מערכות חשבונאות ותשלום",
        tosRespTitle: "3. אחריות המשתמש",
        tosRespText: "אתם מתחייבים:",
        tosRespItem1: "לספק מידע מדויק ומלא",
        tosRespItem2: "לשמור על אבטחת אישורי החשבון שלכם",
        tosRespItem3: "לציית לכל החוקים והתקנות החלים",
        tosRespItem4: "להשתמש בשירותים למטרות חוקיות בלבד",
        tosRespItem5: "לוודא שיש לכם הרשאה מתאימה לגבות תשלומים מהלקוחות שלכם",
        tosPaymentTitle: "4. תשלום וחיוב",
        tosPaymentText: "אתם מסכימים לשלם את כל העמלות הקשורות לשימוש שלכם בשירותים. העמלות כפופות לשינוי בהודעה מוקדמת. אי תשלום עלול להביא להשעיה או הפסקת שירותים.",
        tosIpTitle: "5. קניין רוחני",
        tosIpText: "כל הזכויות, הבעלות והאינטרס בשירותים ובהם, כולל טכנולוגיית ה-AI שלנו, הם ויישארו הקניין הבלעדי של Seenn Inc. אינכם רשאים להעתיק, לשנות או לבצע הנדסה לאחור של כל חלק מהשירותים שלנו.",
        tosDataTitle: "6. שימוש במידע ופרטיות",
        tosDataText: "אנו מעבדים נתוני לקוחות בהתאם להנחיות שלכם ולמדיניות הפרטיות שלנו. אתם אחראים לוודא שיש לכם את הזכות החוקית לשתף נתוני לקוחות איתנו למטרות גביית תשלומים.",
        tosLiabilityTitle: "7. הגבלת אחריות",
        tosLiabilityText: "במידה המקסימלית המותרת בחוק, Seenn Inc לא תהיה אחראית לכל נזק עקיף, מקרי, מיוחד, תוצאתי או עונשי הנובע מהשימוש שלכם או חוסר היכולת להשתמש בשירותים.",
        tosTerminationTitle: "8. סיום",
        tosTerminationText: "אנו עשויים להפסיק או להשעות את הגישה שלכם לשירותים שלנו באופן מיידי, ללא הודעה מוקדמת, בגין כל הפרה של תנאים אלה. עם הסיום, זכותכם להשתמש בשירותים תיפסק באופן מיידי.",
        tosChangesTitle: "9. שינויים בתנאים",
        tosChangesText: "אנו שומרים לעצמנו את הזכות לשנות תנאים אלה בכל עת. נודיע לכם על כל שינוי על ידי פרסום התנאים החדשים בדף זה. המשך השימוש שלכם בשירותים לאחר שינויים כאלה מהווה קבלת התנאים המעודכנים.",
        tosContactTitle: "10. פרטי קשר",
        tosContactText: "לשאלות לגבי תנאי שימוש אלה, צרו קשר בכתובת:",

        // Footer
        footerTagline: "גבייה אוטומטית עם AI. קבלו תשלומים מהר יותר.",
        product: "מוצרים",
        collectionsAgent: "ג'ס - סוכנת גבייה AI",
        afterHoursAgent: "מייקל - סוכן שירות לאחר שעות העבודה (בקרוב)",
        company: "חברה",
        legal: "משפטי",
        privacy: "מדיניות פרטיות",
        terms: "תנאי שימוש",
        copyright: "כל הזכויות שמורות ל-Seenn Inc 2025"
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