import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import sessionsRouter from "./sessions";
import moodsRouter from "./moods";
import dashboardRouter from "./dashboard";
import syllabusRouter from "./syllabus";
import assignmentsRouter from "./assignments";
import dailyTrackerRouter from "./daily-tracker";
import notesRouter from "./notes";
import studentDetailRouter from "./student-detail";
import aiSummaryRouter from "./ai-summary";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(sessionsRouter);
router.use(moodsRouter);
router.use(dashboardRouter);
router.use(syllabusRouter);
router.use(assignmentsRouter);
router.use(dailyTrackerRouter);
router.use(notesRouter);
router.use(studentDetailRouter);
router.use(aiSummaryRouter);

export default router;
