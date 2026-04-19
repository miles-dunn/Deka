import { WaitingRoomClient } from "../../../../components/WaitingRoomClient";

interface WaitingRoomPageProps {
  params: {
    roomId: string;
  };
  searchParams: {
    participantId?: string;
  };
}

export default function WaitingRoomPage({ params, searchParams }: WaitingRoomPageProps) {
  return <WaitingRoomClient roomId={params.roomId} participantId={searchParams.participantId ?? ""} />;
}
