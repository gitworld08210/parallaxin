import { motion } from "framer-motion";
import { Bell, BellOff, MessageCircle, MoreHorizontal, Share2, UserPlus, Check } from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Ban, Flag, VolumeX } from "lucide-react";

interface OwnActionsProps {
  mode: "self";
  editHref: string;
  onShare: () => void;
  onInvite?: () => void;
  isCreator: boolean;
  onBecomeCreator: () => void;
}

interface VisitorActionsProps {
  mode: "visitor";
  isFollowing: boolean;
  isMuted: boolean;
  isBlocked: boolean;
  notifyOn?: boolean;
  onFollowToggle: () => void;
  onMessage: () => void;
  onShare: () => void;
  onNotifyToggle?: () => void;
  onMute: () => void;
  onBlock: () => void;
  onReport: () => void;
  username: string;
}

type Props = OwnActionsProps | VisitorActionsProps;

const btn =
  "inline-flex items-center justify-center gap-2 h-11 rounded-full text-sm font-semibold transition-all duration-fast ease-out-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97]";

/** Premium profile action bar. */
export const ProfileActions = (props: Props) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-wrap items-center gap-2"
    >
      {props.mode === "self" ? (
        <>
          <Link
            to={props.editHref}
            className={cn(btn, "flex-1 min-w-[140px] px-5 bg-primary text-primary-foreground hover:brightness-110 shadow-md")}
          >
            Edit profile
          </Link>
          {!props.isCreator && (
            <button
              type="button"
              onClick={props.onBecomeCreator}
              className={cn(btn, "px-5 bg-secondary text-foreground hover:bg-secondary/80 border border-border")}
            >
              Become creator
            </button>
          )}
          <IconAction label="Share profile" onClick={props.onShare}>
            <Share2 className="h-4.5 w-4.5" />
          </IconAction>
          {props.onInvite && (
            <IconAction label="Invite" onClick={props.onInvite}>
              <UserPlus className="h-4.5 w-4.5" />
            </IconAction>
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={props.onFollowToggle}
            aria-pressed={props.isFollowing}
            className={cn(
              btn,
              "flex-1 min-w-[120px] px-5",
              props.isFollowing
                ? "bg-secondary text-foreground border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 group"
                : "bg-primary text-primary-foreground hover:brightness-110 shadow-md",
            )}
          >
            {props.isFollowing ? (
              <>
                <Check className="h-4 w-4 group-hover:hidden" />
                <span className="group-hover:hidden">Following</span>
                <span className="hidden group-hover:inline">Unfollow</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                <span>Follow</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={props.onMessage}
            className={cn(btn, "flex-1 min-w-[120px] px-5 bg-secondary text-foreground border border-border hover:bg-secondary/70")}
          >
            <MessageCircle className="h-4 w-4" />
            <span>Message</span>
          </button>

          {props.isFollowing && props.onNotifyToggle && (
            <IconAction
              label={props.notifyOn ? "Turn off notifications" : "Turn on notifications"}
              onClick={props.onNotifyToggle}
              active={!!props.notifyOn}
            >
              {props.notifyOn ? <Bell className="h-4.5 w-4.5" /> : <BellOff className="h-4.5 w-4.5" />}
            </IconAction>
          )}
          <IconAction label="Share profile" onClick={props.onShare}>
            <Share2 className="h-4.5 w-4.5" />
          </IconAction>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More actions"
                className={cn(
                  "grid place-items-center h-11 w-11 rounded-full bg-secondary text-foreground border border-border transition-all duration-fast active:scale-95 hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-2xl">
              <DropdownMenuItem onClick={props.onMute} className="gap-2">
                <VolumeX className="h-4 w-4" />
                {props.isMuted ? "Unmute" : "Mute"} @{props.username}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={props.onReport}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <Flag className="h-4 w-4" />
                Report @{props.username}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={props.onBlock}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <Ban className="h-4 w-4" />
                {props.isBlocked ? "Unblock" : "Block"} @{props.username}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </motion.div>
  );
};

const IconAction = ({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      "grid place-items-center h-11 w-11 rounded-full border border-border transition-all duration-fast active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      active
        ? "bg-primary/15 text-primary border-primary/30"
        : "bg-secondary text-foreground hover:bg-secondary/70",
    )}
  >
    {children}
  </button>
);

export default ProfileActions;
