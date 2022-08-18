export interface Comment {
    consumerId: number,
    consumerFirstName: string,
    consumerLastName: string,
    commentId: number,
    comment: string,
    commentTimeStamp: string,
    commentIsDeleted: boolean,
    commentIsFlagged: boolean,
    childComments: Comment[]
}
