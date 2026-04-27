// Skill data configuration file
// Used to manage data for the skill display page

interface SkillBase {
	id: string;
	name: string;
	description: string;
	icon: string; // Iconify icon name
	category: "frontend" | "backend" | "database" | "tools" | "other";
	projects?: string[]; // Related project IDs
	certifications?: string[];
	color?: string; // Skill card theme color
}

export type Skill = SkillBase & {
	/**
	 * Skill start month, supports `YYYY-MM` only.
	 * Example: "2022-09"
	 */
	startedAt: string;
	/**
	 * Skill end month (optional), supports `YYYY-MM` only.
	 * If omitted, duration is calculated to current date.
	 */
	endedAt?: string;
};

export const skillsData: Skill[] = [
	// Frontend Skills
	{
		id: "javascript",
		name: "JavaScript",
		description:
			"Modern JavaScript development, including ES6+ syntax, asynchronous programming, and modular development.",
		icon: "logos:javascript",
		category: "frontend",
		startedAt: "2025-09",
		projects: [
			"mizuki-blog",
			"portfolio-website",
			"data-visualization-tool",
		],
		color: "#F7DF1E",
	},
	{
		id: "typescript",
		name: "TypeScript",
		description:
			"A type-safe superset of JavaScript that enhances code quality and development efficiency.",
		icon: "logos:typescript-icon",
		category: "frontend",
		startedAt: "2026-04",
		projects: ["mizuki-blog", "portfolio-website", "task-manager-app"],
		color: "#3178C6",
	},
	{
		id: "react",
		name: "React",
		description:
			"A JavaScript library for building user interfaces, including Hooks, Context, and state management.",
		icon: "logos:react",
		category: "frontend",
		startedAt: "2025-10",
		projects: ["portfolio-website", "task-manager-app"],
		color: "#61DAFB",
	},
	{
		id: "vue",
		name: "Vue.js",
		description:
			"A progressive JavaScript framework that is easy to learn and use, suitable for rapid development.",
		icon: "logos:vue",
		category: "frontend",
		startedAt: "2025-12",
		projects: ["data-visualization-tool"],
		color: "#4FC08D",
	},
	{
		id: "angular",
		name: "Angular",
		description:
			"An enterprise-level frontend framework developed by Google, a complete single-page application solution.",
		icon: "logos:angular-icon",
		category: "frontend",
		startedAt: "",
		projects: ["enterprise-dashboard"],
		color: "#DD0031",
	},
	{
		id: "nextjs",
		name: "Next.js",
		description:
			"A production-level React framework supporting SSR, SSG, and full-stack development.",
		icon: "logos:nextjs-icon",
		category: "frontend",
		startedAt: "",
		projects: ["e-commerce-frontend", "blog-platform"],
		color: "#616161", // 更改为深灰色，避免纯黑色
	},
	{
		id: "nuxtjs",
		name: "Nuxt.js",
		description:
			"An intuitive Vue.js framework supporting server-side rendering and static site generation.",
		icon: "logos:nuxt-icon",
		category: "frontend",
		startedAt: "",
		projects: ["vue-ssr-app"],
		color: "#00DC82",
	},
	{
		id: "astro",
		name: "Astro",
		description:
			"A modern static site generator supporting multi-framework integration and excellent performance.",
		icon: "logos:astro-icon",
		category: "frontend",
		startedAt: "2026-02",
		projects: ["mizuki-blog"],
		color: "#FF5D01",
	},
	{
		id: "tailwindcss",
		name: "Tailwind CSS",
		description:
			"A utility-first CSS framework for rapidly building modern user interfaces.",
		icon: "logos:tailwindcss-icon",
		category: "frontend",
		startedAt: "2025-07",
		projects: ["mizuki-blog", "portfolio-website"],
		color: "#06B6D4",
	},
	{
		id: "sass",
		name: "Sass/SCSS",
		description:
			"A CSS preprocessor providing advanced features like variables, nesting, and mixins.",
		icon: "logos:sass",
		category: "frontend",
		startedAt: "2025-08",
		projects: ["legacy-website", "component-library"],
		color: "#CF649A",
	},
	{
		id: "webpack",
		name: "Webpack",
		description:
			"A static module bundler for modern JavaScript applications.",
		icon: "logos:webpack",
		category: "frontend",
		startedAt: "2025-06",
		projects: ["custom-build-tool", "spa-application"],
		color: "#8DD6F9",
	},
	{
		id: "vite",
		name: "Vite",
		description:
			"Next-generation frontend build tool with fast cold starts and hot updates.",
		icon: "logos:vitejs",
		category: "frontend",
		startedAt: "",
		projects: ["vue-project", "react-project"],
		color: "#646CFF",
	},

	// Backend Skills
	{
		id: "nodejs",
		name: "Node.js",
		description:
			"A JavaScript runtime based on Chrome V8 engine, used for server-side development.",
		icon: "logos:nodejs-icon",
		category: "backend",
		startedAt: "2025-10",
		projects: ["data-visualization-tool", "e-commerce-platform"],
		color: "#339933",
	},
	{
		id: "python",
		name: "Python",
		description:
			"A general-purpose programming language suitable for web development, data analysis, machine learning, and more.",
		icon: "logos:python",
		category: "backend",
		startedAt: "2023-05",
		color: "#3776AB",
	},
	{
		id: "java",
		name: "Java",
		description:
			"A mainstream programming language for enterprise application development, cross-platform and object-oriented.",
		icon: "logos:java",
		category: "backend",
		startedAt: "2024-10",
		endedAt: "2025-01",
		projects: ["enterprise-system", "microservices-api"],
		color: "#ED8B00",
	},
	{
		id: "csharp",
		name: "C#",
		description:
			"A modern object-oriented programming language developed by Microsoft, suitable for the .NET ecosystem.",
		icon: "devicon:csharp",
		category: "backend",
		startedAt: "2024-10",
		endedAt: "2025-11",
		projects: ["desktop-application", "web-api"],
		color: "#239120",
	},
	{
		id: "go",
		name: "Go",
		description:
			"An efficient programming language developed by Google, suitable for cloud-native and microservices development.",
		icon: "logos:go",
		category: "backend",
		startedAt: "2025-08",
		projects: ["microservice-demo"],
		color: "#00ADD8",
	},
	{
		id: "rust",
		name: "Rust",
		description:
			"A systems programming language focusing on safety, speed, and concurrency, with no garbage collector.",
		icon: "logos:rust",
		category: "backend",
		startedAt: "2025-10",
		projects: ["system-tool", "performance-critical-app"],
		color: "#CE422B",
	},
	{
		id: "cpp",
		name: "C++",
		description:
			"A high-performance systems programming language widely used in game development, system software, and embedded development.",
		icon: "logos:c-plusplus",
		category: "backend",
		startedAt: "2024-06",
		projects: ["game-engine", "system-optimization"],
		color: "#00599C",
	},
	{
		id: "c",
		name: "C",
		description:
			"A low-level systems programming language, the foundation for operating systems and embedded systems development.",
		icon: "logos:c",
		category: "backend",
		startedAt: "2024-05",
		projects: ["embedded-system", "kernel-module"],
		color: "#A8B9CC",
	},
	{
		id: "kotlin",
		name: "Kotlin",
		description:
			"A modern programming language developed by JetBrains, fully compatible with Java, the preferred choice for Android development.",
		icon: "logos:kotlin-icon",
		category: "backend",
		startedAt: "2025-05",
		projects: ["android-app", "kotlin-backend"],
		color: "#7F52FF",
	},
	{
		id: "swift",
		name: "Swift",
		description:
			"A modern programming language developed by Apple for iOS, macOS, watchOS, and tvOS development.",
		icon: "logos:swift",
		category: "backend",
		startedAt: "",
		projects: ["ios-app", "macos-tool"],
		color: "#FA7343",
	},
	{
		id: "ruby",
		name: "Ruby",
		description:
			"A dynamic, open-source programming language focusing on simplicity and productivity, the foundation of the Rails framework.",
		icon: "logos:ruby",
		category: "backend",
		startedAt: "",
		projects: ["web-prototype"],
		color: "#CC342D",
	},
	{
		id: "php",
		name: "PHP",
		description:
			"A widely-used server-side scripting language, particularly suitable for web development.",
		icon: "logos:php",
		category: "backend",
		startedAt: "2023-10",
		endedAt: "2023-12",
		projects: ["cms-system", "e-commerce-backend"],
		color: "#777BB4",
	},
	{
		id: "express",
		name: "Express.js",
		description: "A fast, minimalist Node.js web application framework.",
		icon: "simple-icons:express",
		category: "backend",
		startedAt: "",
		projects: ["data-visualization-tool"],
		color: "#616161", // 更改为深灰色，避免纯黑色
	},
	{
		id: "spring",
		name: "Spring Boot",
		description:
			"The most popular enterprise application development framework in the Java ecosystem.",
		icon: "logos:spring-icon",
		category: "backend",
		startedAt: "2025-12",
		projects: ["enterprise-system", "rest-api"],
		color: "#6DB33F",
	},
	{
		id: "django",
		name: "Django",
		description:
			"A high-level Python web framework with rapid development and clean, pragmatic design.",
		icon: "logos:django-icon",
		category: "backend",
		startedAt: "",
		projects: ["blog-backend"],
		color: "#092E20",
	},

	// Database Skills
	{
		id: "mysql",
		name: "MySQL",
		description:
			"The world's most popular open-source relational database management system, widely used in web applications.",
		icon: "logos:mysql-icon",
		category: "database",
		startedAt: "2025-03",
		projects: ["e-commerce-platform", "blog-system"],
		color: "#4479A1",
	},
	{
		id: "postgresql",
		name: "PostgreSQL",
		description:
			"A powerful open-source relational database management system.",
		icon: "logos:postgresql",
		category: "database",
		startedAt: "",
		projects: ["e-commerce-platform"],
		color: "#336791",
	},
	{
		id: "redis",
		name: "Redis",
		description:
			"A high-performance in-memory data structure store, used as a database, cache, and message broker.",
		icon: "logos:redis",
		category: "database",
		startedAt: "2025-01",
		projects: ["e-commerce-platform", "real-time-chat"],
		color: "#DC382D",
	},
	{
		id: "mongodb",
		name: "MongoDB",
		description:
			"A document-oriented NoSQL database with a flexible data model.",
		icon: "logos:mongodb-icon",
		category: "database",
		startedAt: "",
		color: "#47A248",
	},
	{
		id: "sqlite",
		name: "SQLite",
		description:
			"A lightweight embedded relational database, suitable for mobile applications and small projects.",
		icon: "simple-icons:sqlite",
		category: "database",
		startedAt: "2025-06",
		projects: ["mobile-app", "desktop-tool"],
		color: "#003B57",
	},
	{
		id: "firebase",
		name: "Firebase",
		description:
			"Google's mobile and web application development platform providing real-time database and authentication services.",
		icon: "simple-icons:firebase",
		category: "database",
		startedAt: "",
		projects: ["task-manager-app"],
		color: "#FFCA28",
	},

	// Tools
	{
		id: "git",
		name: "Git",
		description:
			"A distributed version control system, an essential tool for code management and team collaboration.",
		icon: "logos:git-icon",
		category: "tools",
		startedAt: "2023-10",
		color: "#F05032",
	},
	{
		id: "vscode",
		name: "VS Code",
		description:
			"A lightweight but powerful code editor with a rich plugin ecosystem.",
		icon: "logos:visual-studio-code",
		category: "tools",
		startedAt: "2023-10",
		color: "#007ACC",
	},
	{
		id: "webstorm",
		name: "WebStorm",
		description:
			"A professional JavaScript and web development IDE developed by JetBrains with intelligent code assistance.",
		icon: "logos:webstorm",
		category: "tools",
		startedAt: "",
		projects: ["react-project", "vue-project"],
		color: "#00CDD7",
	},
	{
		id: "intellij",
		name: "IntelliJ IDEA",
		description:
			"JetBrains flagship IDE, the preferred tool for Java development with powerful intelligent coding assistance.",
		icon: "logos:intellij-idea",
		category: "tools",
		startedAt: "2025-08",
		projects: ["java-enterprise", "spring-boot-app"],
		color: "#616161", // 更改为深灰色，避免纯黑色
	},
	{
		id: "pycharm",
		name: "PyCharm",
		description:
			"A professional Python IDE by JetBrains providing intelligent code analysis and debugging features.",
		icon: "logos:pycharm",
		category: "tools",
		startedAt: "2023-10",
		projects: ["python-web-app", "data-analysis"],
		color: "#21D789",
	},
	{
		id: "rider",
		name: "Rider",
		description:
			"A cross-platform .NET IDE by JetBrains supporting development in C#, VB.NET, F#, and other languages.",
		icon: "logos:rider",
		category: "tools",
		startedAt: "",
		projects: ["dotnet-api", "desktop-app"],
		color: "#616161", // 更改为深灰色，避免纯黑色
	},
	{
		id: "goland",
		name: "GoLand",
		description:
			"A professional Go language IDE by JetBrains providing intelligent coding assistance and debugging tools.",
		icon: "logos:goland",
		category: "tools",
		startedAt: "2025-08",
		projects: ["go-microservice"],
		color: "#3D7BF7",
	},
	{
		id: "docker",
		name: "Docker",
		description:
			"A containerization platform that simplifies application deployment and environment management.",
		icon: "logos:docker-icon",
		category: "tools",
		startedAt: "2025-04",
		color: "#2496ED",
	},
	{
		id: "kubernetes",
		name: "Kubernetes",
		description:
			"A container orchestration platform for automating deployment, scaling, and management of containerized applications.",
		icon: "logos:kubernetes",
		category: "tools",
		startedAt: "",
		projects: ["microservices-deployment"],
		color: "#326CE5",
	},
	{
		id: "nginx",
		name: "Nginx",
		description: "A high-performance web server and reverse proxy server.",
		icon: "logos:nginx",
		category: "tools",
		startedAt: "2024-12",
		projects: ["web-server-config", "load-balancer"],
		color: "#009639",
	},
	{
		id: "apache",
		name: "Apache HTTP Server",
		description:
			"The world's most popular web server software, a stable and reliable HTTP server.",
		icon: "logos:apache",
		category: "tools",
		startedAt: "",
		projects: ["traditional-web-server", "php-hosting"],
		color: "#D22128",
	},
	{
		id: "openresty",
		name: "OpenResty",
		description:
			"A high-performance web platform based on Nginx and LuaJIT, supporting dynamic web application development.",
		icon: "simple-icons:nginx",
		category: "tools",
		startedAt: "",
		projects: ["api-gateway", "dynamic-routing"],
		color: "#00A693",
	},
	{
		id: "tomcat",
		name: "Apache Tomcat",
		description:
			"A Java Servlet container and web server, the standard deployment environment for Java web applications.",
		icon: "logos:tomcat",
		category: "tools",
		startedAt: "2025-02",
		projects: ["java-web-app", "servlet-container"],
		color: "#F8DC75",
	},
	{
		id: "aws",
		name: "AWS",
		description:
			"Amazon's cloud platform providing comprehensive cloud computing solutions.",
		icon: "logos:aws",
		category: "tools",
		startedAt: "2025-04",
		projects: ["cloud-deployment", "serverless-app"],
		color: "#FF9900",
	},
	{
		id: "linux",
		name: "Linux",
		description:
			"An open-source operating system, the preferred choice for server deployment and development environments.",
		icon: "logos:linux-tux",
		category: "tools",
		startedAt: "2024-08",
		projects: ["server-management", "shell-scripting"],
		color: "#FCC624",
	},
	{
		id: "postman",
		name: "Postman",
		description:
			"An API development and testing tool that simplifies API design, testing, and documentation.",
		icon: "logos:postman-icon",
		category: "tools",
		startedAt: "2024-08",
		projects: ["api-testing", "api-documentation"],
		color: "#FF6C37",
	},
	{
		id: "figma",
		name: "Figma",
		description:
			"A collaborative interface design tool for UI/UX design and prototyping.",
		icon: "logos:figma",
		category: "tools",
		startedAt: "",
		color: "#F24E1E",
	},
	{
		id: "photoshop",
		name: "Photoshop",
		description: "Professional image editing and design software.",
		icon: "logos:adobe-photoshop",
		category: "tools",
		startedAt: "2025-10",
		projects: ["ui-design", "image-processing"],
		color: "#31A8FF",
	},

	// Other Skills
	{
		id: "graphql",
		name: "GraphQL",
		description:
			"An API query language and runtime providing a more efficient, powerful, and flexible way to fetch data.",
		icon: "logos:graphql",
		category: "other",
		startedAt: "",
		projects: ["modern-api"],
		color: "#E10098",
	},
	{
		id: "elasticsearch",
		name: "Elasticsearch",
		description:
			"A distributed search and analytics engine used for full-text search and data analysis.",
		icon: "logos:elasticsearch",
		category: "other",
		startedAt: "",
		projects: ["search-system"],
		color: "#005571",
	},
	{
		id: "jest",
		name: "Jest",
		description:
			"A JavaScript testing framework focused on simplicity and ease of use.",
		icon: "logos:jest",
		category: "other",
		startedAt: "2025-12",
		projects: ["unit-testing", "integration-testing"],
		color: "#C21325",
	},
	{
		id: "cypress",
		name: "Cypress",
		description:
			"A modern end-to-end testing framework for web applications.",
		icon: "logos:cypress-icon",
		category: "other",
		startedAt: "",
		projects: ["e2e-testing"],
		color: "#17202C",
	},
];
