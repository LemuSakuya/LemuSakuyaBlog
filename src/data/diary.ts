export interface DiaryItem {
	id: number | string;
	title?: string;
	content: string;
	date: string;
	images?: string[];
	location?: string;
	mood?: string;
	tags?: string[];
	link?: string;
}
