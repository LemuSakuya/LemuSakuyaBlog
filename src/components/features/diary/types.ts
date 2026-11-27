import type { DiaryItem } from "../../../data/diary";

export interface MomentCardProps {
	moment: DiaryItem;
	minutesAgo: string;
	hoursAgo: string;
	daysAgo: string;
}
