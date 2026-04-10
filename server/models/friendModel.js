import { pool } from "../config/db.js";

export async function addFriend({ requesterId, email }) {
	const normalizedEmail = (email || "").trim().toLowerCase();

	if (!requesterId) {
		const error = new Error("Requester ID is required");
		error.code = "INVALID_REQUESTER";
		throw error;
	}

	if (!normalizedEmail) {
		const error = new Error("Recipient email is required");
		error.code = "INVALID_EMAIL";
		throw error;
	}

	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		const requesterResult = await client.query(
			`SELECT id, email FROM users WHERE id = $1`,
			[requesterId]
		);

		const requester = requesterResult.rows[0];
		if (!requester) {
			const error = new Error("Requester not found");
			error.code = "INVALID_REQUESTER";
			throw error;
		}

		if ((requester.email || "").toLowerCase() === normalizedEmail) {
			const error = new Error("You cannot add yourself as a friend");
			error.code = "SELF_FRIEND_REQUEST";
			throw error;
		}

		const recipientResult = await client.query(
			`
			SELECT id, first_name, last_name, email
			FROM users
			WHERE LOWER(email) = LOWER($1)
			`,
			[normalizedEmail]
		);

		const recipient = recipientResult.rows[0];

		if (!recipient) {
			const error = new Error("No user found with that email");
			error.code = "USER_NOT_FOUND";
			throw error;
		}

		const existingFriendshipResult = await client.query(
			`
			SELECT id
			FROM friends
			WHERE user1_id = LEAST($1::uuid, $2::uuid)
				AND user2_id = GREATEST($1::uuid, $2::uuid)
			`,
			[requesterId, recipient.id]
		);

		if (existingFriendshipResult.rows.length > 0) {
			const error = new Error("Users are already friends");
			error.code = "ALREADY_FRIENDS";
			throw error;
		}

		const pendingRequestResult = await client.query(
			`
			SELECT id, requester_id, recipient_id, status
			FROM friend_requests
			WHERE status = 'pending'
				AND (
					(requester_id = $1 AND recipient_id = $2)
					OR
					(requester_id = $2 AND recipient_id = $1)
				)
			LIMIT 1
			`,
			[requesterId, recipient.id]
		);

		if (pendingRequestResult.rows.length > 0) {
			const error = new Error("A pending friend request already exists");
			error.code = "23505";
			throw error;
		}

		const insertResult = await client.query(
			`
			INSERT INTO friend_requests (requester_id, recipient_id, status)
			VALUES ($1, $2, 'pending')
			RETURNING id, requester_id, recipient_id, status, created_at
			`,
			[requesterId, recipient.id]
		);

		await client.query("COMMIT");

		return {
			...insertResult.rows[0],
			recipient: {
				id: recipient.id,
				firstName: recipient.first_name,
				lastName: recipient.last_name,
				email: recipient.email,
			},
		};
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

export async function getFriends(userId) {
	const result = await pool.query(
		`
		SELECT
			f.id AS friendship_id,
			f.created_at AS friends_since,
			u.id,
			u.first_name,
			u.last_name,
			u.email
		FROM friends f
		JOIN users u
			ON u.id = CASE
				WHEN f.user1_id = $1 THEN f.user2_id
				ELSE f.user1_id
			END
		WHERE f.user1_id = $1 OR f.user2_id = $1
		ORDER BY f.created_at DESC
		`,
		[userId]
	);

	return result.rows.map((row) => ({
		id: row.id,
		firstName: row.first_name,
		lastName: row.last_name,
		email: row.email,
		friendshipId: row.friendship_id,
		friendsSince: row.friends_since,
	}));
}

export async function getFriendsByUser({ userId }) {
	return getFriends(userId);
}

export async function getSentFriendRequests(userId) {
	const result = await pool.query(
		`
		SELECT 
			fr.id,
			fr.status,
			fr.created_at,
			recipient.first_name AS recipient_first_name,
			recipient.last_name AS recipient_last_name,
			recipient.email AS recipient_email
			FROM friend_requests fr
			JOIN users recipient 
				ON fr.recipient_id = recipient.id
			WHERE fr.requester_id = $1 AND fr.status = 'pending'
			ORDER BY fr.created_at DESC;
		`,

		[userId]
	);

	return result.rows.map((row) => ({
		id: row.id,
		initials: `${(row.recipient_first_name || "").charAt(0)}${(row.recipient_last_name || "").charAt(0)}`.toUpperCase(),
		first_name: row.recipient_first_name,
		last_name: row.recipient_last_name,
		email: row.recipient_email,
		status: row.status,
		createdAt: row.created_at,
	}));
}

export async function getIncomingFriendRequests(userId) {
		const result = await pool.query(
		`
		SELECT
			fr.id,
			fr.status,
			fr.created_at,
			requester.first_name AS requester_first_name,
			requester.last_name AS requester_last_name,
			requester.email AS requester_email
			FROM friend_requests fr
			JOIN users requester 
				ON fr.requester_id = requester.id
			WHERE fr.recipient_id = $1 AND fr.status = 'pending'
			ORDER BY fr.created_at DESC;
		`,

		[userId]
	);

	return result.rows.map((row) => ({
		id: row.id,
		initials: `${(row.requester_first_name || "").charAt(0)}${(row.requester_last_name || "").charAt(0)}`.toUpperCase(),
		first_name: row.requester_first_name,
		last_name: row.requester_last_name,
		email: row.requester_email,
		status: row.status,
		createdAt: row.created_at,
	}));
}

export async function acceptFriendRequest({ requestId, userId }) {
	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		const requestResult = await client.query(
			`
			SELECT id, requester_id, recipient_id, status
			FROM friend_requests
			WHERE id = $1 AND recipient_id = $2
			LIMIT 1
			`,
			[requestId, userId]
		);

		const request = requestResult.rows[0];
		if (!request) {
			const error = new Error("Friend request not found");
			error.code = "REQUEST_NOT_FOUND";
			throw error;
		}

		if (request.status !== "pending") {
			const error = new Error("Only pending requests can be accepted");
			error.code = "INVALID_REQUEST_STATUS";
			throw error;
		}

		const updateResult = await client.query(
			`
			UPDATE friend_requests
			SET status = 'accepted'
			WHERE id = $1
			RETURNING id, requester_id, recipient_id, status, created_at
			`,
			[requestId]
		);

		await client.query(
			`
			INSERT INTO friends (user1_id, user2_id)
			VALUES (LEAST($1::uuid, $2::uuid), GREATEST($1::uuid, $2::uuid))
			ON CONFLICT (user1_id, user2_id) DO NOTHING
			`,
			[request.requester_id, request.recipient_id]
		);

		await client.query("COMMIT");
		return updateResult.rows[0];
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

export async function declineFriendRequest({ requestId, userId }) {
	const result = await pool.query(
		`
		UPDATE friend_requests
		SET status = 'rejected'
		WHERE id = $1
		  AND recipient_id = $2
		  AND status = 'pending'
		RETURNING id, requester_id, recipient_id, status, created_at
		`,
		[requestId, userId]
	);

	if (result.rows.length === 0) {
		const existing = await pool.query(
			`SELECT id, status FROM friend_requests WHERE id = $1 AND recipient_id = $2 LIMIT 1`,
			[requestId, userId]
		);

		if (existing.rows.length === 0) {
			const error = new Error("Friend request not found");
			error.code = "REQUEST_NOT_FOUND";
			throw error;
		}

		const error = new Error("Only pending requests can be declined");
		error.code = "INVALID_REQUEST_STATUS";
		throw error;
	}

	return result.rows[0];
}

export async function cancelFriendRequest({ requestId, userId }) {
	const result = await pool.query(
		`
		UPDATE friend_requests
		SET status = 'cancelled'
		WHERE id = $1
		  AND requester_id = $2
		  AND status = 'pending'
		RETURNING id, requester_id, recipient_id, status, created_at
		`,
		[requestId, userId]
	);

	// recipient_id

	if (result.rows.length === 0) {
		const existing = await pool.query(
			`SELECT id, status FROM friend_requests WHERE id = $1 AND requester_id = $2 LIMIT 1`,
			[requestId, userId]
		);

		if (existing.rows.length === 0) {
			const error = new Error("Friend request not found");
			error.code = "REQUEST_NOT_FOUND";
			throw error;
		}

		const error = new Error("Only pending requests can be cancelled");
		error.code = "INVALID_REQUEST_STATUS";
		throw error;
	}

	return result.rows[0];
}
