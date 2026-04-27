import type { TimelineItem } from "../components/features/timeline/types";

export const timelineData: TimelineItem[] = [
	{
		id: "current-study",
		title: "Studying Computer Science and Technology",
		description:
			"Currently studying Computer Science and Technology, focusing on machine learning and artificial intelligence.",
		type: "education",
		startDate: "2024-09-01",
		location: "Changsha",
		organization: "Hunan Normal University",
		skills: [
			"Python",
			"MySQL",
			"Machine Learning",
			"Deep Learning",
			"PyTorch",
			"TensorFlow",
		],
		achievements: [
			"Current GPA: 3.81/5.00",
			"Conducting an innovative training program for college students",
		],
		icon: "material-symbols:school",
		color: "#059669",
		featured: true,
	},
	{
		id: "deepbinddta-preview-project",
		title: "DeepBindDTA Preview",
		description:
			"A software development project focused on drug-target affinity inference, model experimentation, and result visualization.",
		type: "project",
		startDate: "2025-04-01",
		skills: ["Python", "PyTorch", "FastAPI", "React"],
		achievements: [
			"Built a complete preview workflow for model experimentation",
			"Integrated data processing, backend API, and frontend visualization",
		],
		links: [
			{
				name: "GitHub Repository",
				url: "https://github.com/LemuSakuya/DeepBindDTA--Preview-",
				type: "project",
			},
		],
		icon: "material-symbols:terminal",
		color: "#0EA5E9",
		featured: true,
	},
	{
		id: "high-school-graduation",
		title: "High School Graduation",
		description:
			"Graduated from high school with excellent grades and was admitted to the Computer Science and Technology program at Hunan Normal University.",
		type: "education",
		startDate: "2021-09-01",
		endDate: "2024-06-30",
		location: "Shunde, Guangzhou",
		organization: "Shunde No.1 Middle School",
		achievements: [
			"College entrance exam score: 620.6",
			"Received municipal model student award",
			"Won provincial second prize in math competition",
			"Won provincial second prize in physics competition",
		],
		icon: "material-symbols:school",
		color: "#2563EB",
	},
	{
		id: "first-programming-experience",
		title: "First Programming Experience",
		description:
			"First encountered programming in high school IT class, started learning Python basic syntax.",
		type: "education",
		startDate: "2021-03-01",
		skills: ["Python", "Basic Programming Concepts"],
		achievements: [
			'Completed first "Hello World" program',
			"Learned basic loops and conditional statements",
			"Developed interest in programming",
		],
		icon: "material-symbols:code",
		color: "#7C3AED",
	},
];
