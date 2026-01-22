import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export function useUser() {
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        let storedId = localStorage.getItem('guest_user_id');
        if (!storedId) {
            storedId = uuidv4();
            localStorage.setItem('guest_user_id', storedId);
        }
        setUserId(storedId);
    }, []);

    return userId;
}
