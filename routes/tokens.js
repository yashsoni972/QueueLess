const express = require('express');
const router = express.Router();
const Token = require('../models/Token');
const Service = require('../models/Service');

// Helper function to format time (e.g. "10:35 AM")
function formatTime(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutes} ${ampm}`;
}

// Join Queue (Generate Token)
router.post('/join', async (req, res) => {
    try {
        let { userId, serviceId } = req.body;

        // If serviceId not provided, default to single Smart Service Center
        if (!serviceId) {
            const defaultService = await Service.findOne({ status: 'active' });
            if (defaultService) {
                serviceId = defaultService._id;
            } else {
                return res.status(404).json({ msg: 'No active service found' });
            }
        }

        // Check if user already has an active token for this service
        const existingToken = await Token.findOne({
            userId,
            serviceId,
            status: { $in: ['waiting', 'serving'] }
        });

        if (existingToken) {
            return res.status(400).json({ msg: 'You already have an active token in queue' });
        }

        // Count tokens generated today for token number format (T-1, T-2...)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const count = await Token.countDocuments({ serviceId, createdAt: { $gte: startOfDay } });
        const tokenNumber = `T-${count + 1}`;

        // Get people ahead in queue
        const peopleAhead = await Token.countDocuments({ serviceId, status: 'waiting' });

        const newToken = new Token({
            tokenNumber,
            userId,
            serviceId,
            position: peopleAhead + 1
        });

        await newToken.save();

        // Fetch service details for dynamic prediction calculation
        const service = await Service.findById(serviceId);
        const avgTime = service && service.averageServiceTime ? service.averageServiceTime : 5;
        const estimatedWaitMinutes = Math.max(1, peopleAhead * avgTime);

        const now = new Date();
        const turnDate = new Date(now.getTime() + estimatedWaitMinutes * 60000);
        const returnDate = new Date(turnDate.getTime() - 5 * 60000); // 5 mins before

        const estimatedTurnTime = formatTime(turnDate);
        const recommendedReturnTime = formatTime(returnDate > now ? returnDate : now);

        let alertStatus = 'BREAK';
        let statusBanner = '🟢 YOU CAN TAKE A SHORT BREAK';

        if (peopleAhead <= 1 || estimatedWaitMinutes <= 5) {
            alertStatus = 'YOUR_TURN';
            statusBanner = '🔴 YOUR TURN IS NEXT! PLEASE RETURN TO COUNTER';
        } else if (estimatedWaitMinutes <= 10) {
            alertStatus = 'RETURN_SOON';
            statusBanner = '🟡 PLEASE RETURN TO COUNTER SOON';
        }

        res.status(201).json({
            token: newToken,
            peopleAhead,
            estimatedWait: estimatedWaitMinutes,
            estimatedTurnTime,
            recommendedReturnTime,
            alertStatus,
            statusBanner,
            avgServiceTime: avgTime
        });

    } catch (err) {
        console.error('Join Queue Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// Get Latest Active Token for User (with Dynamic Prediction & Return Alert)
router.get('/active/:userId', async (req, res) => {
    try {
        const token = await Token.findOne({
            userId: req.params.userId,
            status: { $in: ['waiting', 'serving'] }
        }).populate('serviceId').sort({ createdAt: -1 });

        if (!token) return res.status(404).json({ msg: 'No active token found' });

        const service = token.serviceId;
        const avgTime = (service && service.averageServiceTime) ? service.averageServiceTime : 5;

        // Currently serving token
        const currentlyServingToken = await Token.findOne({
            serviceId: service._id,
            status: 'serving'
        });

        let peopleAhead = 0;
        if (token.status === 'waiting') {
            peopleAhead = await Token.countDocuments({
                serviceId: service._id,
                status: 'waiting',
                createdAt: { $lt: token.createdAt }
            });
            if (currentlyServingToken) peopleAhead += 1;
        }

        const estimatedWaitMinutes = token.status === 'serving' ? 0 : Math.max(1, peopleAhead * avgTime);

        const now = new Date();
        const turnDate = new Date(now.getTime() + estimatedWaitMinutes * 60000);
        const returnDate = new Date(turnDate.getTime() - 5 * 60000);

        const estimatedTurnTime = token.status === 'serving' ? 'NOW' : formatTime(turnDate);
        const recommendedReturnTime = token.status === 'serving' ? 'NOW' : formatTime(returnDate > now ? returnDate : now);

        let alertStatus = 'BREAK';
        let statusBanner = '🟢 YOU CAN TAKE A SHORT BREAK';

        if (token.status === 'serving') {
            alertStatus = 'YOUR_TURN';
            statusBanner = '🔴 YOUR TURN IS NOW SERVING AT COUNTER!';
        } else if (peopleAhead <= 1 || estimatedWaitMinutes <= 5) {
            alertStatus = 'YOUR_TURN';
            statusBanner = '🔴 YOUR TURN IS NEXT! PLEASE RETURN TO COUNTER';
        } else if (estimatedWaitMinutes <= 10) {
            alertStatus = 'RETURN_SOON';
            statusBanner = '🟡 PLEASE RETURN TO COUNTER SOON';
        }

        res.json({
            token,
            currentlyServing: currentlyServingToken ? currentlyServingToken.tokenNumber : 'None',
            peopleAhead,
            estimatedWait: estimatedWaitMinutes,
            estimatedTurnTime,
            recommendedReturnTime,
            alertStatus,
            statusBanner,
            avgServiceTime: avgTime
        });
    } catch (err) {
        console.error('Active Token Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// Get User's Token History (Completed & Cancelled)
router.get('/history/:userId', async (req, res) => {
    try {
        const tokens = await Token.find({
            userId: req.params.userId,
            status: { $in: ['completed', 'cancelled'] }
        })
        .populate('serviceId')
        .sort({ createdAt: -1 });

        res.json(tokens);
    } catch (err) {
        console.error('Token History Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// Get Service Queue Status
router.get('/status/:serviceId', async (req, res) => {
    try {
        const currentlyServing = await Token.findOne({ serviceId: req.params.serviceId, status: 'serving' })
            .sort({ updatedAt: -1 });

        const lastToken = await Token.findOne({ serviceId: req.params.serviceId })
            .sort({ createdAt: -1 });

        const totalWaiting = await Token.countDocuments({ serviceId: req.params.serviceId, status: 'waiting' });

        const service = await Service.findById(req.params.serviceId);

        res.json({
            currentlyServing: currentlyServing ? currentlyServing.tokenNumber : 'None',
            lastToken: lastToken ? lastToken.tokenNumber : 'None',
            totalWaiting,
            avgServiceTime: service ? service.averageServiceTime : 5
        });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// ADMIN: Call Next Token
router.post('/admin/next', async (req, res) => {
    try {
        let { serviceId } = req.body;

        if (!serviceId) {
            const defaultService = await Service.findOne({ status: 'active' });
            if (defaultService) serviceId = defaultService._id;
        }

        const now = new Date();

        // Mark currently serving token as completed and update dynamic average time
        const currentServing = await Token.findOne({ serviceId, status: 'serving' });
        if (currentServing) {
            currentServing.status = 'completed';
            currentServing.completedAt = now;

            if (currentServing.servedAt) {
                const durationMinutes = Math.max(1, Math.round((now.getTime() - currentServing.servedAt.getTime()) / 60000));
                currentServing.serviceDurationMinutes = durationMinutes;

                // Update service dynamic average time
                const service = await Service.findById(serviceId);
                if (service) {
                    service.totalServedTokens = (service.totalServedTokens || 0) + 1;
                    service.totalServiceDuration = (service.totalServiceDuration || 0) + durationMinutes;
                    service.averageServiceTime = Math.max(1, Math.round(service.totalServiceDuration / service.totalServedTokens));
                    await service.save();
                }
            }
            await currentServing.save();
        }

        // Find next waiting token
        const nextToken = await Token.findOne({ serviceId, status: 'waiting' }).sort({ createdAt: 1 });

        if (!nextToken) {
            return res.json({
                msg: 'No more waiting tokens in queue',
                currentlyServing: 'None'
            });
        }

        nextToken.status = 'serving';
        nextToken.servedAt = now;
        await nextToken.save();

        const service = await Service.findById(serviceId);

        res.json({
            msg: `Now Serving Token ${nextToken.tokenNumber}`,
            currentlyServingToken: nextToken,
            currentlyServing: nextToken.tokenNumber,
            avgServiceTime: service ? service.averageServiceTime : 5
        });

    } catch (err) {
        console.error('Admin Next Token Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ADMIN: Mark Current Token Completed
router.post('/admin/complete', async (req, res) => {
    try {
        let { serviceId } = req.body;

        if (!serviceId) {
            const defaultService = await Service.findOne({ status: 'active' });
            if (defaultService) serviceId = defaultService._id;
        }

        const now = new Date();

        const currentServing = await Token.findOne({ serviceId, status: 'serving' });
        if (!currentServing) {
            return res.status(404).json({ msg: 'No token is currently serving' });
        }

        currentServing.status = 'completed';
        currentServing.completedAt = now;

        if (currentServing.servedAt) {
            const durationMinutes = Math.max(1, Math.round((now.getTime() - currentServing.servedAt.getTime()) / 60000));
            currentServing.serviceDurationMinutes = durationMinutes;

            const service = await Service.findById(serviceId);
            if (service) {
                service.totalServedTokens = (service.totalServedTokens || 0) + 1;
                service.totalServiceDuration = (service.totalServiceDuration || 0) + durationMinutes;
                service.averageServiceTime = Math.max(1, Math.round(service.totalServiceDuration / service.totalServedTokens));
                await service.save();
            }
        }

        await currentServing.save();

        const updatedService = await Service.findById(serviceId);

        res.json({
            msg: `Token ${currentServing.tokenNumber} marked as Completed`,
            avgServiceTime: updatedService ? updatedService.averageServiceTime : 5
        });

    } catch (err) {
        console.error('Admin Complete Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// Cancel Token
router.post('/cancel/:tokenId', async (req, res) => {
    try {
        const token = await Token.findById(req.params.tokenId);
        if (!token) return res.status(404).json({ msg: 'Token not found' });

        token.status = 'cancelled';
        await token.save();

        res.json({ msg: 'Token cancelled successfully' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
