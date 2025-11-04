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
        aboutUs: "אודותינו",
        contact: "צור קשר",
        login: "התחבר",
        getStarted: "התחל עכשיו",
        jessProduct: "ג'ס - סוכנת חייבים AI",
        jessProductDesc: "אוטומציה לגביית תשלומים",
        michaelProduct: "מייקל - סוכן מחוץ לשעות העבודה",
        michaelProductDesc: "בקרוב",

        // Hero section
        heroTitle: "תפסיקו לרדוף אחרי תשלומים. התחילו לגבות אוטומטית.",
        heroSubtitle: "הסוכן הדיגיטלי שלכם מתקשר ויוצר קשר עם לקוחות שחייבים, עוקב אחר הכללים שלכם ומשפר לכם את תזרים המזומנים בבנק. שיפור של כ- 60% בגביה ובתזרים המזומנים.",
        startTrial: "התחל תקופת ניסיון חינם",

        // Jess section
        sayHelloJess: "תכירו את ג'ס",
        jessSubtitle: "הסוכנת הדיגיטלית שמטפלת בתזכורות התשלום שלכם - כך שאתם לא צריכים.",
        phoneReminders: "תזכורות טלפוניות:",
        phoneDesc: "שיחות קוליות טבעיות שעוקבות אחר הכללים שלכם.",
        whatsappSms: "WhatsApp / SMS:",
        whatsappDesc: "תזכורות מהירות עם קישורים לתשלום מיידי.",
        emailFollowups: "מעקב באימייל:",
        emailDesc: "מותאם אישית, משקף את המותג שלכם, ומתועד במערכת.",

        // How it works
        howItWorksTitle: "איך זה עובד",
        howItWorksSubtitle: "האצל את גביית התשלומים בשלבים פשוטים וחזור להתמקד בצמיחת העסק שלך.",
        step0Title: "הגדרה ב-5 שניות",
        step0Desc: "קבלו מספר טלפון חדש עם אינטגרציית WhatsApp מהירה תוך 5 שניות בלבד. כספק טכנולוגיה מאושר של Meta, אנחנו מבטיחים תקשורת חלקה ומאובטחת לכל תזכורות התשלום שלכם.",
        step1Title: "הגדירו את כללי התשלום שלכם",
        step1Desc: "ספרו לנו על תנאי התשלום, תקופות חסד וכללי הסלמה שלכם. נגדיר את הסוכן הדיגיטלי שלכם לפעול לפי המפרט המדויק שלכם ולטפל בגבייה בצורה מקצועית.",
        step2Title: "הסוכן מתקשר ללקוחות שחייבים",
        step2Desc: "כאשר תשלומים מאחרים, הסוכן הדיגיטלי שלכם מתקשר אוטומטית ללקוחות לפי הכללים שלכם. בלי עבודה ידנית, תוך שמירה על יחסים מקצועיים והבטחת תשלומים בזמן.",
        step3Title: "קבלו תשלומים מהר יותר",
        step3Desc: "60% יותר תשלומים שנגבו. 40% תזרים מזומנים טוב יותר. אפס שיחות גבייה מביכות בשבילכם. התמקדו בצמיחת העסק בזמן שאנחנו מטפלים בגבייה.",
        buildWorkforce: "בנו את כוח העבודה המנהלי של המחר",

        // Agents section
        agentsSubtitle: "לוגיקה חזקה וסוכני בינה מלאכותית",
        agentsTitle: "סוכני AI שגובים תשלומים ותופסים לידים 24/7",
        agentsDesc: "הסוכן הדיגיטלי שלך מטפל בגבייה אוטומטית. הוסף מענה ללידים 24/7 כשדרוג אופציונלי.",
        specializedExperts: "שני סוכנים מיוחדים לצמיחת הכנסות",

        // Meet your team
        ourAgents: "הסוכנים שלנו",
        meetTeamTitle: "חבר צוות הגבייה הדיגיטלי שלך",
        meetTeamDesc: "לא רק בוט. סוכן AI מתוחכם שמשתלב עם מערכת החשבונאות שלך, לומד את העדפות הגבייה שלך ומנהל באופן מקצועי חשבונות שחייבים.",
        feature1: "שיחות תזכורת תשלום אוטומטיות",
        feature2: "יצירת קשר רב-ערוצית (טלפון, אימייל, WhatsApp)",
        feature3: "כללי הסלמת גבייה הניתנים להתאמה אישית",
        feature4: "תקשורת מקצועית השומרת על יחסי לקוחות",

        // Footer
        footerTagline: "בצע גבייה אוטומטית עם AI. קבל תשלומים מהר יותר.",
        product: "מוצרים",
        collectionsAgent: "ג'ס - סוכנת חייבים AI",
        afterHoursAgent: "מייקל - סוכן מחוץ לשעות העבודה (בקרוב)",
        company: "חברה",
        legal: "משפטי",
        privacy: "מדיניות פרטיות",
        terms: "תנאי שימוש",
        copyright: "כל הזכויות שמורות לחברת Seenn Inc 2025"
    }
};

// Language switching functionality
document.addEventListener('DOMContentLoaded', function() {
    let currentLang = 'en';
    const langToggle = document.getElementById('langToggle');
    const html = document.documentElement;

    langToggle.addEventListener('click', function() {
        currentLang = currentLang === 'en' ? 'he' : 'en';
        updateLanguage(currentLang);
    });

    function updateLanguage(lang) {
        // Update direction and language attribute
        if (lang === 'he') {
            html.setAttribute('dir', 'rtl');
            html.setAttribute('lang', 'he');
            langToggle.textContent = 'English';
        } else {
            html.setAttribute('dir', 'ltr');
            html.setAttribute('lang', 'en');
            langToggle.textContent = 'עברית';
        }

        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (translations[lang][key]) {
                element.textContent = translations[lang][key];
            }
        });
    }

});