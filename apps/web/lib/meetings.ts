// 모임 API — POST|GET /api/meetings, GET|POST /api/meetings/{id}
import type {
  MeetingCreated,
  MeetingSummary,
  MeetingDetail,
  CreateMeetingRequest,
  RecommendationsResponse,
  ConfirmResult,
  AggregateResponse,
  UpdateMeetingRequest,
} from "@whenwe/types";
import { authGet, authPost, authPatch, authDelete } from "./api";

export function createMeeting(body: CreateMeetingRequest): Promise<MeetingCreated> {
  return authPost<MeetingCreated>("/api/meetings", body);
}

export function listMeetings(): Promise<MeetingSummary[]> {
  return authGet<MeetingSummary[]>("/api/meetings");
}

export function getMeeting(meetingId: number): Promise<MeetingDetail> {
  return authGet<MeetingDetail>(`/api/meetings/${meetingId}`);
}

export function getRecommendations(meetingId: number): Promise<RecommendationsResponse> {
  return authGet<RecommendationsResponse>(`/api/meetings/${meetingId}/recommendations`);
}

export function getAggregate(meetingId: number): Promise<AggregateResponse> {
  return authGet<AggregateResponse>(`/api/meetings/${meetingId}/aggregate`);
}

export function updateMeeting(
  meetingId: number,
  body: UpdateMeetingRequest,
): Promise<MeetingDetail> {
  return authPatch<MeetingDetail>(`/api/meetings/${meetingId}`, body);
}

export function deleteMeeting(meetingId: number): Promise<Record<string, never>> {
  return authDelete<Record<string, never>>(`/api/meetings/${meetingId}`);
}

export function confirmMeeting(meetingId: number, recommendationId: number): Promise<ConfirmResult> {
  return authPost<ConfirmResult>(`/api/meetings/${meetingId}/confirm`, { recommendationId });
}
